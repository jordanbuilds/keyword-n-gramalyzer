# Keyword N-Gramalyzer

**Keyword N-Gramalyzer** is a React-based tool that helps analyze keyword data at scale by generating N-grams from keyword lists and calculating associated metrics (like Clicks, Impressions, CTR, and Position). It provides a streamlined interface to process raw keyword data, create N-gram frequency distributions, and compute important metrics using either the SUM or AVG calculation methods.

## Features

- **N-Gram Generator**: Easily generate 1-gram, 2-gram, or 3-gram keyword phrases from raw keyword data.
- **Metrics Calculation**: Configure metrics (e.g., Clicks, Impressions, CTR, and Position) to be calculated via SUM or AVG.
- **Input Flexibility**: Accepts raw keyword data through text input or TSV file upload.
- **Error Handling**: Automatically detects and reports errors such as missing or invalid metric values.
- **CSV Export**: Export the analyzed N-gram data along with calculated metrics into a CSV format.

## Demo

### Example Input Format:

- The first row is expected to be the header row.
- Each subsequent row contains a query followed by its metrics (e.g., Clicks, Impressions, CTR, Position).

## Usage

### Text Input
1. Paste your data into the text area. Ensure the format is **tab-separated** with the following structure:
   - First column: Keyword queries.
   - Next columns: Metric values (e.g., Clicks, Impressions, CTR, Position).

2. Select the **N-Gram size** (e.g., 1-Gram for single words, 2-Gram for pairs, 3-Gram for triplets).

3. Configure metric calculations by enabling/disabling metrics or selecting SUM/AVG for calculations.

4. Click **Re-Calculate** to process the input data and generate N-grams.

5. **Export CSV** to download the results.
