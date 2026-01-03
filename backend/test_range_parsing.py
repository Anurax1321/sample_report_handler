"""
Test script for reference range parsing bug fix
"""
from app.services.neonatal_analyzer import NeonatalReportAnalyzer
from pathlib import Path
import tempfile

# Create a dummy PDF path for testing
with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
    temp_path = f.name

try:
    analyzer = NeonatalReportAnalyzer(temp_path, "test.pdf")

    # Test cases for parse_reference_range
    test_cases = [
        # (input, expected_output, description)
        ("<3.00", (None, 3.0), "Less than"),
        (">5.0", (5.0, None), "Greater than"),
        ("0.9-45", (0.9, 45.0), "Normal range"),
        ("72.5-816", (72.5, 816.0), "Normal range with decimals"),
        ("0.00 - 0.5", (0.0, 0.5), "Range with spaces"),
        ("0.00 -0.429", (0.0, 0.429), "Range with space before dash"),
        ("-5-10", (-5.0, 10.0), "Negative to positive range"),
        ("-10--5", (-10.0, -5.0), "Negative to negative range"),
        ("0-1256", (0.0, 1256.0), "Zero to large number"),
        ("3.5", (None, 3.5), "Single value"),
    ]

    print("Testing Reference Range Parsing\n" + "="*50)

    passed = 0
    failed = 0

    for input_str, expected, description in test_cases:
        result = analyzer.parse_reference_range(input_str)
        status = "✓ PASS" if result == expected else "✗ FAIL"

        if result == expected:
            passed += 1
        else:
            failed += 1

        print(f"{status} | {description:30} | Input: {input_str:15} | Expected: {expected} | Got: {result}")

    print("\n" + "="*50)
    print(f"Results: {passed} passed, {failed} failed out of {len(test_cases)} tests")

    if failed == 0:
        print("✅ All tests passed!")
    else:
        print("❌ Some tests failed!")

finally:
    # Cleanup
    Path(temp_path).unlink(missing_ok=True)
