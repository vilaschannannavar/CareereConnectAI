"""Performance benchmark test verifying that a 5,000-row LinkedIn CSV processes in <10 seconds."""
import time
from app.services.csv_parser import parse_csv_preview


def test_bulk_5000_row_csv_performance():
    """Benchmark parsing of a large 5,000-connection LinkedIn CSV export."""
    headers = [
        "First Name,Last Name,URL,Email Address,Company,Position,Connected On\n"
    ]
    rows = []
    for i in range(5000):
        rows.append(
            f"User{i},LastName{i},https://www.linkedin.com/in/user-{i},"
            f"user{i}@example.com,Company {i % 50},Software Engineer {i % 10},01 Jan 2024\n"
        )
    csv_bytes = "".join(headers + rows).encode("utf-8")

    start_time = time.perf_counter()
    result = parse_csv_preview(csv_bytes)
    duration = time.perf_counter() - start_time

    assert result["total_rows"] == 5000
    assert len(result["headers"]) >= 6

    # Verify processing takes strictly under 10 seconds
    assert duration < 10.0, f"Processing took {duration:.2f} seconds, exceeding 10s benchmark limit."
