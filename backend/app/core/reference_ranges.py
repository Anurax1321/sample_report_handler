# Reference ranges for Newborn Screening (NBS) Report Processing
# These values are medically validated - DO NOT MODIFY without medical approval

# Standard patient reference ranges (min, max) for all compounds
range_dict = {
    # Amino Acids
    'Ala': (103, 742), 'Arg': (1, 41), 'Asp': (10, 345), 'Cit': (5, 43),
    'Glu': (152, 708), 'Gly': (0, 1142), 'Leu': (27, 324), 'Met': (5, 41),
    'Orn': (10, 263), 'Phe': (10, 102), 'Pro': (87, 441), 'Tyr': (15, 259),
    'Val': (52, 322),

    # Acylcarnitines
    'C0': (5, 125), 'C2': (1.4, 80), 'C3': (0.18, 6.3), 'C4': (0.08, 1.7),
    'C5': (0.01, 1), 'C5DC': (0.01, 2.99), 'C6': (0.01, 0.95), 'C8': (0.01, 0.6),
    'C10': (0.02, 0.65), 'C12': (0.02, 0.6), 'C14': (0.01, 1.22),
    'C16': (0.34, 10.35), 'C18': (0.21, 2.03),

    # Extended Acylcarnitines
    'C5:1': (0.01, 0.9), 'C4OH': (0.01, 1.29), 'C5OH': (0.01, 0.9),
    'C8:1': (0.01, 0.7), 'C3DC': (0.1, 0.45), 'C10:2': (0.01, 0.22),
    'C10:1': (0.01, 0.45), 'C4DC': (0.1, 1.25), 'C12:1': (0.01, 0.5),
    'C6DC': (0.01, 0.23), 'C14:2': (0, 0.2), 'C14:1': (0.01, 0.8),
    'C14OH': (0, 0.2), 'C16:1': (0.01, 1.4), 'C16:1OH': (0.01, 0.1),
    'C16OH': (0.01, 0.1), 'C18:2': (0.1, 0.73), 'C18:1': (0.5, 7),
    'C18:2OH': (0.01, 0.03), 'C18:1OH': (0.01, 0.1), 'C18OH': (0.01, 0.1)
}

# Control I reference ranges (lower confidence control values)
control_1_range_dict = {
    'Ala': (335, 696), 'Arg': (4.82, 22.7), 'Asp': (29.1, 76.5),
    'Cit': (10.4, 31.3), 'Glu': (227, 471), 'Gly': (212, 494),
    'Leu': (129, 268), 'Met': (19.9, 46.3), 'Orn': (67.7, 319),
    'Phe': (56, 116), 'Pro': (199, 370), 'Tyr': (53, 124),
    'Val': (135, 356), 'C0': (12.8, 44.1), 'C2': (4.91, 23.1),
    'C3': (1.15, 3.04), 'C4': (0.674, 1.4), 'C5': (0.316, 0.833),
    'C5DC': (0.562, 2.65), 'C6': (0.211, 0.557), 'C8': (0.274, 0.721),
    'C10': (0.137, 0.361), 'C12': (0.250, 0.658), 'C14': (0.220, 0.579),
    'C16': (0.657, 1.73), 'C18': (0.233, 0.699)
}

# Control II reference ranges (higher confidence control values)
control_2_range_dict = {
    'Ala': (794, 1475), 'Arg': (30.8, 123), 'Asp': (169, 445),
    'Cit': (128, 385), 'Glu': (460, 854), 'Gly': (681, 1590),
    'Leu': (357, 742), 'Met': (236, 490), 'Orn': (309, 814),
    'Phe': (432, 897), 'Pro': (343, 712), 'Tyr': (371, 772),
    'Val': (352, 820), 'C0': (61.2, 184), 'C2': (35.5, 142),
    'C3': (8.76, 18.2), 'C4': (6.61, 12.3), 'C5': (1.37, 3.2),
    'C5DC': (2.2, 8.79), 'C6': (0.675, 1.4), 'C8': (1.35, 3.55),
    'C10': (0.546, 1.44), 'C12': (4.16, 7.73), 'C14': (1.66, 3.88),
    'C16': (5.93, 15.6), 'C18': (2.29, 8.03)
}

# Multiplication factors for data normalization (compound-specific)
# These are laboratory-calibrated values - DO NOT MODIFY
MULTIPLICATION_FACTORS = {
    # Amino Acids file (_AA.txt)
    "AA": {
        "Gly": 403,      # Glycine has special factor
        "default": 80.6  # All other amino acids
    },

    # Acylcarnitines file (_AC.txt)
    "AC": {
        "C0": 24.5,
        "C2": 6.15,
        "C3": 1.1,
        "C14": 1.1,
        "C4": 1.48,
        "C8": 1.48,
        "C5DC": 1.68,
        "C16": 2.58,
        "C18": 2.58,
        "C5": 1.29,
        "C6": 1.29,
        "C10": 1.29,
        "C12": 1.29
    },

    # Extended Acylcarnitines file (_AC_EXT.txt)
    "AC_EXT": {
        "C5:1": 1.29, "C5OH": 1.29, "C10:2": 1.29, "C10:1": 1.29,
        "C12:1": 1.29, "C6DC": 1.29,
        "C4OH": 1.48, "C8:1": 1.48, "C3DC": 1.48, "C4DC": 1.48,
        "C14:2": 1.1, "C14:1": 1.1, "C14OH": 1.1,
        "C16:1": 2.58, "C16:1OH": 2.58, "C16OH": 2.58, "C18:2": 2.58,
        "C18:1": 2.58, "C18:2OH": 2.58, "C18:1OH": 2.58, "C18OH": 2.58
    }
}

# Ratio reference ranges for additional calculated fields
# These are based on amino acid ratio thresholds from the PDF template
ratio_range_dict = {
    'TotalCN': (10, 184),        # Total Carnitines (sum of all C* compounds)
    'Met/Leu': (0, 0.42),        # Met / Leu ratio - max 0.42
    'Met/Phe': (0, 0.70),        # Met / Phe ratio - max 0.70
    'Phe/Tyr': (0, 2.00),        # Phe / Tyr (PKU) ratio - max 2.00
    'Leu/Ala': (0.12, 1.00),     # Leu / Ala ratio - 0.12-1.00
    'Leu/Tyr': (0.50, 3.50),     # Leu / Tyr ratio - 0.50-3.50
}
