"""
Test script for NeonatalReportAnalyzer
Run this to verify the analyzer works before integrating with FastAPI
"""

import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.neonatal_analyzer import NeonatalReportAnalyzer


def test_single_pdf():
    """Test analyzing a single PDF report."""
    print("=" * 80)
    print("TEST: Single PDF Analysis")
    print("=" * 80)

    pdf_path = Path(__file__).parent / "test_reports" / "report1.pdf"

    if not pdf_path.exists():
        print(f"ERROR: Test file not found: {pdf_path}")
        return False

    try:
        # Create analyzer
        analyzer = NeonatalReportAnalyzer(str(pdf_path))

        # Extract text
        print(f"\n1. Extracting text from: {pdf_path.name}")
        text = analyzer.extract_text_from_pdf()
        print(f"   ✓ Extracted {len(text)} characters")

        # Parse patient info
        print("\n2. Parsing patient information...")
        analyzer.parse_patient_info()
        print(f"   ✓ Found {len(analyzer.patient_info)} patient fields")
        for key, value in analyzer.patient_info.items():
            print(f"     - {key}: {value}")

        # Parse all test data
        print("\n3. Parsing test parameters...")
        analyzer.parse_biochemical_parameters()
        print(f"   ✓ Biochemical params: {len(analyzer.biochemical_params)}")

        analyzer.parse_amino_acids()
        print(f"   ✓ Amino acids: {len(analyzer.amino_acids)}")

        analyzer.parse_amino_acid_ratios()
        print(f"   ✓ Amino acid ratios: {len(analyzer.amino_acid_ratios)}")

        analyzer.parse_acylcarnitines()
        print(f"   ✓ Acylcarnitines: {len(analyzer.acylcarnitines)}")

        analyzer.parse_acylcarnitine_ratios()
        print(f"   ✓ Acylcarnitine ratios: {len(analyzer.acylcarnitine_ratios)}")

        # Validate
        print("\n4. Validating values against reference ranges...")
        analyzer.validate_all_values()

        summary = analyzer.get_summary()
        print(f"   ✓ Total tests: {summary['total_tests']}")
        print(f"   ✓ Normal: {summary['normal_count']}")
        print(f"   ✓ Abnormal: {summary['abnormal_count']}")
        print(f"   ✓ Status: {summary['status'].upper()}")

        # Show abnormalities if any
        if analyzer.abnormalities:
            print("\n5. Abnormalities found:")
            for abn in analyzer.abnormalities:
                print(f"   ⚠️  {abn['category']}: {abn['analyte']}")
                print(f"      Value: {abn['value']} {abn['unit']}")
                print(f"      Reference: {abn['reference_range']}")
                print(f"      Reason: {abn['reason']}")
        else:
            print("\n5. ✓ No abnormalities - all values normal!")

        # Test to_dict() method
        print("\n6. Testing to_dict() conversion...")
        result_dict = analyzer.to_dict()
        print(f"   ✓ Converted to dictionary with {len(result_dict)} keys")

        print("\n" + "=" * 80)
        print("✓ TEST PASSED: Single PDF analysis works correctly!")
        print("=" * 80)
        return True

    except Exception as e:
        print(f"\n✗ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_reference_range_parsing():
    """Test reference range parsing logic."""
    print("\n" + "=" * 80)
    print("TEST: Reference Range Parsing")
    print("=" * 80)

    # Create a dummy analyzer just to test the parsing method
    pdf_path = Path(__file__).parent / "test_reports" / "report1.pdf"
    analyzer = NeonatalReportAnalyzer(str(pdf_path))

    test_cases = [
        ("<3.00", (None, 3.0)),
        (">5.0", (5.0, None)),
        ("0.9-45", (0.9, 45.0)),
        ("72.5-816", (72.5, 816.0)),
        ("0.00 - 0.5", (0.0, 0.5)),
        ("0.00 -0.429", (0.0, 0.429)),
    ]

    all_passed = True
    for range_str, expected in test_cases:
        result = analyzer.parse_reference_range(range_str)
        passed = result == expected
        status = "✓" if passed else "✗"
        print(f"  {status} '{range_str}' -> {result} (expected {expected})")
        if not passed:
            all_passed = False

    if all_passed:
        print("\n✓ All reference range parsing tests passed!")
    else:
        print("\n✗ Some reference range parsing tests failed!")

    return all_passed


def main():
    """Run all tests."""
    print("\n" + "🧪" * 40)
    print("NEONATAL REPORT ANALYZER - TEST SUITE")
    print("🧪" * 40 + "\n")

    tests_passed = 0
    tests_total = 2

    # Test 1: Reference range parsing
    if test_reference_range_parsing():
        tests_passed += 1

    # Test 2: Single PDF analysis
    if test_single_pdf():
        tests_passed += 1

    # Summary
    print("\n" + "=" * 80)
    print(f"TEST SUMMARY: {tests_passed}/{tests_total} tests passed")
    print("=" * 80)

    if tests_passed == tests_total:
        print("\n✅ ALL TESTS PASSED! Analyzer is ready for API integration.\n")
        return 0
    else:
        print(f"\n❌ {tests_total - tests_passed} test(s) failed. Please fix before proceeding.\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
