import csv
import hashlib
from datetime import date, datetime
from pathlib import Path
from string import ascii_uppercase

from openpyxl import load_workbook
from openpyxl.utils import get_column_letter


# --------------------------------------------------
# 1. Project paths
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

WORKBOOK = (
    ROOT
    / "results"
    / "MailSage Evaluation Tracker (Tests A-Z).xlsx"
)

OUTPUT_DIR = ROOT / "results" / "csv"


# --------------------------------------------------
# 2. Export configuration
# --------------------------------------------------

# Each entry represents one table within the workbook.
# Some worksheets contain multiple independent tables.

EXPORTS = [
    {
        "sheet": "Test Register",
        "filename": "test-register.csv",
        "header_row": 5,
        "first_row": 6,
        "last_row": 31,
        "expected_ids": list(ascii_uppercase),
    },
    {
        "sheet": "Paired Comparisons",
        "filename": "paired-comparisons.csv",
        "header_row": 5,
        "first_row": 6,
        "last_row": 12,
        "expected_ids": [
            "N / M",
            "O / P",
            "Q / R",
            "S / T",
            "U / V",
            "W / X",
            "Z / Y",
        ],
    },
    {
        "sheet": "Benchmark Results",
        "filename": "benchmark-results.csv",
        "header_row": 5,
        "first_row": 6,
        "last_row": 11,
        "expected_ids": list("UVWXYZ"),
    },
    {
        "sheet": "Benchmark Results",
        "filename": "benchmark-seeded-defects.csv",
        "header_row": 16,
        "first_row": 17,
        "last_row": 24,
        "expected_ids": [
            f"B{i}" for i in range(1, 9)
        ],
    },
    {
        "sheet": "Issue Matrix",
        "filename": "issue-matrix.csv",
        "header_row": 5,
        "first_row": 6,
        "last_row": 11,
        "expected_ids": [
            f"T{i}" for i in range(1, 7)
        ],
    },
    {
        "sheet": "Issue Matrix",
        "filename": "issue-matrix-q-t-details.csv",
        "header_row": 15,
        "first_row": 16,
        "last_row": 19,
        "expected_ids": list("QRST"),
    },
    {
        "sheet": "Evidence Index",
        "filename": "evidence-index.csv",
        "header_row": 5,
        "first_row": 6,
        "last_row": 26,
        "expected_ids": [
            f"E{i:02d}" for i in range(1, 22)
        ],
    },
]


# --------------------------------------------------
# 3. Value formatting
# --------------------------------------------------

def prepare_value(value):
    """
    Convert an Excel value into a CSV-compatible string.

    Missing values remain blank.
    Dates are converted to ISO format.
    Recorded numerical values remain unchanged.
    """

    if value is None:
        return ""

    if isinstance(value, (date, datetime)):
        return value.isoformat()

    return str(value)


# --------------------------------------------------
# 4. Validate and extract a table
# --------------------------------------------------

def extract_table(workbook, config):
    sheet_name = config["sheet"]
    worksheet = workbook[sheet_name]

    header_row = config["header_row"]
    first_row = config["first_row"]
    last_row = config["last_row"]

    # Read the specified table only.
    rows = list(
        worksheet.iter_rows(
            min_row=header_row,
            max_row=last_row,
            values_only=True,
        )
    )

    if not rows:
        raise ValueError(
            f"No data found in {sheet_name}"
        )

    # The first extracted row contains headings.
    header = rows[0]

    # Skip any gap between the heading and first record.
    offset = first_row - header_row
    records = rows[offset:]

    # Identify the last column containing actual data.
    width = max(
        (
            index
            for row in rows
            for index, value in enumerate(row, 1)
            if value is not None
            and str(value).strip() != ""
        ),
        default=0,
    )

    if width == 0:
        raise ValueError(
            f"Empty table: {sheet_name}"
        )

    # Preserve all populated columns.
    # Explicitly label columns that lack source headings.
    headings = []

    for index in range(width):
        value = (
            header[index]
            if index < len(header)
            else None
        )

        if value is None or str(value).strip() == "":
            headings.append(
                f"Unlabelled column "
                f"{get_column_letter(index + 1)}"
            )
        else:
            headings.append(prepare_value(value))

    # Convert the records into CSV-compatible values.
    formatted_records = []

    for row in records:
        formatted_records.append([
            prepare_value(
                row[index]
                if index < len(row)
                else None
            )
            for index in range(width)
        ])

    # Verify the expected identifiers.
    actual_ids = [
        record[0].strip()
        for record in formatted_records
    ]

    expected_ids = config["expected_ids"]

    if actual_ids != expected_ids:
        raise ValueError(
            f"\nValidation failed: {sheet_name}\n"
            f"File: {config['filename']}\n"
            f"Expected: {expected_ids}\n"
            f"Found: {actual_ids}"
        )

    print(
        f"PASS: {config['filename']} "
        f"contains the expected records."
    )

    return [headings] + formatted_records


# --------------------------------------------------
# 5. Write and verify a CSV file
# --------------------------------------------------

def write_and_verify(filename, rows):
    destination = OUTPUT_DIR / filename

    with destination.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as file:

        # Use LF line endings for GitHub compatibility.
        writer = csv.writer(
            file,
            lineterminator="\n",
        )

        writer.writerows(rows)

    # Read the exported CSV back into Python.
    with destination.open(
        "r",
        newline="",
        encoding="utf-8",
    ) as file:
        exported_rows = list(csv.reader(file))

    # Compare exported values with source values.
    if exported_rows != rows:
        raise ValueError(
            f"CSV verification failed: {filename}"
        )

    record_count = len(rows) - 1

    print(
        f"VERIFIED: {filename} "
        f"({record_count} records)"
    )


# --------------------------------------------------
# 6. Main export workflow
# --------------------------------------------------

def main():
    if not WORKBOOK.is_file():
        raise FileNotFoundError(
            f"Workbook not found: {WORKBOOK}"
        )

    # Record a fingerprint of the original workbook.
    original_hash = hashlib.sha256(
        WORKBOOK.read_bytes()
    ).hexdigest()

    workbook = load_workbook(
        WORKBOOK,
        read_only=True,
        data_only=True,
    )

    try:
        prepared_exports = []

        # Validate all tables before writing CSV files.
        for config in EXPORTS:
            rows = extract_table(
                workbook,
                config,
            )

            prepared_exports.append(
                (config["filename"], rows)
            )

        # Create the output directory.
        OUTPUT_DIR.mkdir(
            parents=True,
            exist_ok=True,
        )

        print("\nWriting CSV files...")
        print("-" * 50)

        for filename, rows in prepared_exports:
            write_and_verify(filename, rows)

    finally:
        workbook.close()

    # Confirm the original workbook was not modified.
    final_hash = hashlib.sha256(
        WORKBOOK.read_bytes()
    ).hexdigest()

    if original_hash != final_hash:
        raise ValueError(
            "Workbook fingerprint changed unexpectedly."
        )

    print()
    print("=" * 50)
    print("CSV EXPORT COMPLETE")
    print("=" * 50)

    print(
        f"Exported files: {len(prepared_exports)}"
    )

    print(
        "Original workbook: UNCHANGED"
    )

    print(
        "CSV read-back verification: PASSED"
    )

    print(
        "Ready for privacy and publication review."
    )


if __name__ == "__main__":
    main()