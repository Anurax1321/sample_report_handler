# Structure module adapted from Vijayrekha_python_reports
# Handles DataFrame restructuring with control limits and reference ranges

import pandas as pd
from app.core.reference_ranges import range_dict, control_1_range_dict, control_2_range_dict

class StructureError(Exception):
    """Custom exception for DataFrame structuring errors"""
    pass

def redefine_dataframe(df: pd.DataFrame, c1_flag: bool = False, c2_flag: bool = False) -> pd.DataFrame:
    """
    Redefine and format dataframe with control limits or reference ranges

    Args:
        df: Input DataFrame to restructure
        c1_flag: True if this is Control I data
        c2_flag: True if this is Control II data

    Returns:
        Reformatted DataFrame with limits and formatting rows

    Raises:
        StructureError: If flags are invalid or processing fails
    """
    try:
        if c1_flag or c2_flag:
            # Process controls
            return _process_control_dataframe(df, c1_flag, c2_flag)
        else:
            # Process patient data
            return _process_patient_dataframe(df)

    except Exception as e:
        raise StructureError(f"Error restructuring dataframe: {str(e)}")

def _process_control_dataframe(df: pd.DataFrame, c1_flag: bool, c2_flag: bool) -> pd.DataFrame:
    """Process control dataframes (Control I or Control II)"""
    if not (c1_flag or c2_flag) or (c1_flag and c2_flag):
        raise StructureError("Exactly one of c1_flag or c2_flag must be True")

    # Rename column
    df.rename(columns={'Sample text': 'CONTROLS'}, inplace=True)

    if c1_flag:
        # First set of controls
        df.at[0, 'CONTROLS'] = "Control I"
        df.at[1, 'CONTROLS'] = "Control I"

        # Extract min and max values for Control I
        lower_limit = {
            key: value[0]
            for key, value in control_1_range_dict.items()
            if key in df.columns
        }
        upper_limit = {
            key: value[1]
            for key, value in control_1_range_dict.items()
            if key in df.columns
        }

    elif c2_flag:
        # Second set of controls
        df.at[2, 'CONTROLS'] = "Control II"
        df.at[3, 'CONTROLS'] = "Control II"

        # Extract min and max values for Control II
        lower_limit = {
            key: value[0]
            for key, value in control_2_range_dict.items()
            if key in df.columns
        }
        upper_limit = {
            key: value[1]
            for key, value in control_2_range_dict.items()
            if key in df.columns
        }

    # Add mean values
    mean_df = pd.DataFrame([df.iloc[:, 1:].mean()])
    mean_df['CONTROLS'] = 'Mean Values'
    mean_df = mean_df[df.columns]
    df = pd.concat([df, mean_df], ignore_index=True)

    # Format lower limit DataFrame
    lower_limit_df = pd.DataFrame([lower_limit])
    lower_limit_df['CONTROLS'] = 'Lower Control Limit'
    lower_limit_df = lower_limit_df.reindex(columns=df.columns, fill_value="")
    lower_limit_df = lower_limit_df[df.columns]

    # Format upper limit DataFrame
    upper_limit_df = pd.DataFrame([upper_limit])
    upper_limit_df['CONTROLS'] = 'Upper Control Limit'
    upper_limit_df = upper_limit_df.reindex(columns=df.columns, fill_value="")
    upper_limit_df = upper_limit_df[df.columns]

    # Add control limits to DataFrame
    df = pd.concat([df, lower_limit_df, upper_limit_df], ignore_index=True)

    # Add empty rows for formatting
    empty_row = pd.DataFrame([[""] * len(df.columns)], columns=df.columns)
    df = pd.concat([df[:2], empty_row, df[2:3], empty_row, df[3:]]).reset_index(drop=True)

    # Add empty column for formatting
    df.insert(1, "", "")

    return df

def _process_patient_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Process patient data DataFrame"""
    # Create reference range row
    combine_limit = {
        key: f"{value[0]} - {value[1]}"
        for key, value in range_dict.items()
        if key in df.columns
    }

    combine_limit_df = pd.DataFrame([combine_limit])
    combine_limit_df['Sample text'] = 'Reference Range'
    combine_limit_df = combine_limit_df.reindex(columns=df.columns, fill_value="")
    combine_limit_df = combine_limit_df[df.columns]

    # Add reference range row at the top
    df = pd.concat([combine_limit_df, df], ignore_index=True)

    # Add empty row for formatting
    empty_row = pd.DataFrame([[""] * len(df.columns)], columns=df.columns)
    df = pd.concat([df[:1], empty_row, df[1:]]).reset_index(drop=True)

    # Add empty column for formatting
    df.insert(1, "", "")

    return df
