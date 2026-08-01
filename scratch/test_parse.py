import json
from pathlib import Path

md_path = Path("Source Data files/Normalized_Interview_Formats.md")
with open(md_path, "r", encoding="utf-8") as f:
    text = f.read()

gs_idx = text.find("## Goldman Sachs")
sample = text[gs_idx:gs_idx+3000]

with open("scratch/sample_gs.txt", "w", encoding="utf-8") as f:
    f.write(sample)

print("Saved sample to scratch/sample_gs.txt")
