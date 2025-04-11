import openpyxl
import csv

def export_formulas_only(excel_file, output_csv):
    """
    Reads an Excel file (data_only=False) to capture the actual formula text.
    Does NOT include computed (result) values in the output.
    
    Writes a CSV with columns:
      - Cell (e.g., "A1")
      - Formula or Value (if the cell isn't a formula)
    """
    # Load the workbook with formulas intact (not the computed values)
    workbook = openpyxl.load_workbook(excel_file, data_only=False)
    worksheet = workbook.active

    with open(output_csv, mode="w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        # Write header row
        writer.writerow(["Cell", "Formula_or_Value"])

        # Loop through rows and cells
        for row in worksheet.iter_rows():
            for cell in row:
                # If it's a formula, cell.value holds the raw formula text
                # If it's a normal cell, cell.value is the normal cell content
                writer.writerow([cell.coordinate, cell.value])

if __name__ == "__main__":
    excel_file_path = "Financial-model.xlsx"       # Change to your input Excel file
    output_csv_path = "deconstructed-model.csv"    # Change to your desired output CSV file

    export_formulas_only(excel_file_path, output_csv_path)
    print(f"Done! Formulas (and plain values) written to: {output_csv_path}")
