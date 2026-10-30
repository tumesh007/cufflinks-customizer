# Cufflink Studio 3D 👔✨

An interactive, in-browser 3D CAD customizer and STL generator for 3D-printable button-style cufflinks. Optimized for FDM printing on the **Bambu Lab A1 Mini** (0.4mm nozzle, 0.16–0.20mm layer height).

**Live Demo:** [https://tumesh007.github.io/cufflinks-customizer/](https://tumesh007.github.io/cufflinks-customizer/)

---

## Features

- **Real-Time 3D WebGL Viewport:** Powered by Three.js with full orbit, pan, and zoom controls.
- **Design Presets:**
  - **PNB Official Emblem:** Faithfully reconstructed 2022 Brand Standards 'प' (Pa) safe container with coin.
  - **Monogram (e.g. "TK"):** Parametric interlocking serif initials.
  - **Minimal Blank:** Sleek, minimalist face for custom engravings.
- **Parametric Dimensions:**
  - Face Diameter (16–24 mm)
  - Post Length (7–14 mm)
  - Post Diameter (3.5–6.0 mm)
  - Rear Button Diameter (9–15 mm)
- **Batch Layouts:** Preview and export 1 pc, 1 Pair (2 pcs), Tray (4 pcs), or Tray (8 pcs) laid out on the 180×180 mm Bambu A1 Mini print bed.
- **Material Visualizer:** Live rendering in Silk Gold, Polished Silver, PNB Burgundy, Matte Black, or Copper.
- **1-Click STL Export:** Download manifold, watertight binary STLs ready to drag-and-drop into Bambu Studio or OrcaSlicer.
- **Parametric OpenSCAD Export:** Download the corresponding `.scad` code anytime.

---

## 3D Printing & Slicing Recommendations

| Parameter | Setting | Notes |
|---|---|---|
| **Printer** | Bambu Lab A1 Mini (or any FDM printer) | Bed: 180×180 mm |
| **Nozzle** | 0.4 mm | Standard nozzle size |
| **Layer Height** | 0.16 mm - 0.20 mm | 0.16 mm recommended for fine text |
| **Orientation** | **Face-down (Z = 0)** | Decorative face on build plate for mirror finish |
| **Supports** | **NONE** | 45° self-supporting rear button cone transition |
| **Infill** | 100% | Provides solid, premium weight |
| **Dual-Color** | Pause / filament swap at **0.8 mm** | Gives contrasting emblem relief |

---

## Local Development

To run locally:

```bash
# Using Python
python3 -m http.server 8080

# Then open in browser
http://localhost:8080
```

## Deployment

Automated via GitHub Actions and GitHub Pages (`.github/workflows/deploy.yml`).
