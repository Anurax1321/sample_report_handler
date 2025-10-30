#!/usr/bin/env python3
"""Seed database with dummy data for testing"""

from app.db.session import SessionLocal
from app.db import model
from datetime import datetime, timedelta

def seed_database():
    """Add dummy samples if database is empty"""
    db = SessionLocal()
    try:
        # Check if samples already exist
        existing_samples = db.query(model.Sample).count()

        if existing_samples == 0:
            print("📊 Creating dummy samples for testing...")

            # Create multiple test samples
            test_samples = [
                {
                    "sample_code": "NBS001",
                    "test_type": "NBS - Newborn Screening",
                    "collected_by": "Dr. Smith",
                    "priority": "high",
                    "status": model.SampleStatus.received,
                    "notes": "High priority newborn screening test"
                },
                {
                    "sample_code": "NBS002",
                    "test_type": "NBS - Newborn Screening",
                    "collected_by": "Dr. Johnson",
                    "priority": "normal",
                    "status": model.SampleStatus.received,
                    "notes": "Standard newborn screening"
                },
                {
                    "sample_code": "NBS003",
                    "test_type": "NBS - Newborn Screening",
                    "collected_by": "Nurse Williams",
                    "priority": "normal",
                    "status": model.SampleStatus.processing,
                    "notes": "Currently being processed"
                },
                {
                    "sample_code": "TEST001",
                    "test_type": "NBS - Test Sample",
                    "collected_by": "Lab Technician",
                    "priority": "low",
                    "status": model.SampleStatus.received,
                    "notes": "Test sample for report upload validation"
                },
                {
                    "sample_code": "SAMPLE-2024-001",
                    "test_type": "NBS - Metabolic Screening",
                    "collected_by": "Dr. Brown",
                    "priority": "normal",
                    "status": model.SampleStatus.received,
                    "notes": "Metabolic disorder screening"
                }
            ]

            created_count = 0
            for idx, sample_data in enumerate(test_samples):
                dummy_sample = model.Sample(**sample_data)
                db.add(dummy_sample)
                created_count += 1

            db.commit()

            # Print all created samples
            samples = db.query(model.Sample).all()
            print(f"✅ Created {created_count} dummy samples:")
            for sample in samples:
                print(f"   - ID={sample.id}, Code={sample.sample_code}, Status={sample.status}")

        else:
            print(f"✅ Database already has {existing_samples} sample(s)")
            samples = db.query(model.Sample).all()
            for sample in samples:
                print(f"   - ID={sample.id}, Code={sample.sample_code}, Status={sample.status}")

    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
