# Space Safety & Debris Collision Avoidance Platform :

> **College Hackathon Prototype Statement**: Developed for space safety simulation, tracking orbital debris trajectories, predicting satellite conjunctions, evaluating collision risk, and computing energy-optimal avoidance maneuvers.
>
> ⚠️ **IMPORTANT DISCLAIMER**: This is an educational hackathon prototype utilizing simplified Keplerian, J2 perturbation, RTN maneuver frames, and 2D encounter probability models. It is **NOT** a flight-certified spacecraft flight-control system.

---

## 1. Problem Statement
With the rapid increase in active satellites (e.g. Starlink, Kuiper) and legacy space debris (e.g. fragments from Cosmos-2251, Fengyun-1C, Cosmos-1408), Low Earth Orbit (LEO) faces an exponential risk of orbital collisions (Kessler Syndrome). Satellites require automated, real-time trajectory tracking, conjunction detection (predicting Time of Closest Approach - TCA), risk evaluation, and low-energy avoidance maneuver planning to preserve mission lifespan while ensuring satellite survival.

---

## 2. Proposed Solution
An integrated full-stack aerospace simulation platform:
- **Backend**: Python (FastAPI, NumPy, SciPy, SGP4) powering orbital propagation, numerical TCA refinement, 2D $P_c$ collision probability modeling, local RTN candidate burn generation, and SciPy minimum $\Delta v$ optimization.
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Recharts, and CesiumJS 3D Earth visualization.
- **Hackathon Demo Mode**: One-click end-to-end scenario runner demonstrating multi-debris tracking, critical threat identification (~190m miss distance), risk assessment, and low-energy post-burn avoidance trajectory visualization.

---

## 3. System Architecture

```
                  ┌─────────────────────────────────────────┐
                  │       React + Vite + TypeScript         │
                  │             CesiumJS 3D                 │
                  │   Tailwind CSS  + Recharts Dashboard   │
                  └────────────────────┬────────────────────┘
                                       │ REST API (JSON)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │        FastAPI Python Backend           │
                  └────────────────────┬────────────────────┘
                                       │
      ┌────────────────┬───────────────┼───────────────┬────────────────┐
      ▼                ▼               ▼               ▼                ▼
┌───────────┐    ┌───────────┐   ┌───────────┐   ┌───────────┐   ┌─────────────┐
│   Orbit   │    │Trajectory │   │Conjunction│   │   Risk    │   │  Maneuver   │
│  Engine   │    │Propagator │   │ Detection │   │ Analysis  │   │Optimizer RTN│
└───────────┘    └───────────┘   └───────────┘   └───────────┘   └─────────────┘
```

---

## 4. Mathematical Models & Scientific Assumptions

### A. Orbital Propagation (Keplerian + J2 Perturbation)
The system represents spacecraft and debris using Keplerian elements $(a, e, i, \Omega, \omega, M_0)$ and incorporates Earth oblateness ($J_2 = 1.08263 \times 10^{-3}$) secular perturbation rates:

$$\bar{n} = n_0 \left[1 + \frac{3}{2} J_2 \left(\frac{R_E}{p}\right)^2 \sqrt{1-e^2} \left(1 - \frac{3}{2}\sin^2 i\right)\right]$$

$$\dot{\Omega} = -\frac{3}{2} J_2 \left(\frac{R_E}{p}\right)^2 \bar{n} \cos i \quad \text{(Nodal Precession)}$$

$$\dot{\omega} = \frac{3}{2} J_2 \left(\frac{R_E}{p}\right)^2 \bar{n} \left(2 - \frac{5}{2}\sin^2 i\right) \quad \text{(Apsidal Precession)}$$

Position $\vec{r}_{\text{ECI}}$ and velocity $\vec{v}_{\text{ECI}}$ are calculated via Kepler equation $M = E - e \sin E$ solved using Newton-Raphson iteration.

### B. Time of Closest Approach (TCA) Detection
Relative distance $d(t) = \|\vec{r}_{\text{debris}}(t) - \vec{r}_{\text{satellite}}(t)\|$ is minimized over the simulation window using SciPy's bounded Brent minimization algorithm (`minimize_scalar`), locating exact TCA sub-millisecond precision.

### C. Collision Probability ($P_c$) & Prototype Risk Score
- **2D Encounter Probability ($P_c$)**: Projected 2D isotropic Gaussian error covariance in encounter plane (Chan approximation):

  $$P_c = \frac{R^2}{2 \sigma_{\text{pos}}^2} \exp\left(-\frac{d_{\min}^2}{2 \sigma_{\text{pos}}^2}\right)$$

  where $R = r_{\text{sat}} + r_{\text{debris}}$ is the combined hard-body radius, and $\sigma_{\text{pos}} = \sqrt{\sigma_{\text{sat}}^2 + \sigma_{\text{debris}}^2}$ is the 1-sigma position uncertainty.

- **Prototype Collision Risk Score (0–100%)**:
  Integrates exponential miss distance penalty, relative velocity magnitude, and time-to-TCA urgency factor.

### D. Local RTN Reference Frame & Maneuver Generation
Avoidance maneuvers are defined in the satellite's local Radial-Transverse-Normal (RTN / RIC) frame at maneuver execution epoch $t_{\text{burn}}$:

$$\hat{R} = \frac{\vec{r}}{\|\vec{r}\|}, \quad \hat{N} = \frac{\vec{r} \times \vec{v}}{\|\vec{r} \times \vec{v}\|}, \quad \hat{T} = \hat{N} \times \hat{R}$$

$$\vec{\Delta v}_{\text{ECI}} = \begin{bmatrix} \hat{R} & \hat{T} & \hat{N} \end{bmatrix} \vec{\Delta v}_{\text{RTN}}$$

Candidate impulses $\vec{\Delta v}_{\text{RTN}}$ iterate across $+\hat{T}$ (In-Track raise), $-\hat{T}$ (In-Track lower), $\pm\hat{N}$ (Cross-Track plane change), and $\pm\hat{R}$ (Radial) across magnitudes $0.05 \text{ m/s}$ to $5.0 \text{ m/s}$.

### E. Energy & Fuel Mass Model
- Kinetic Energy change: $\Delta E = \frac{1}{2} m_{\text{sat}} (\Delta v)^2$
- Propellant mass consumed (Tsiolkovsky Rocket Equation):

  $$\Delta m = m_{\text{sat}} \left(1 - \exp\left(-\frac{\Delta v}{g_0 I_{\text{sp}}}\right)\right)$$

  (Default $I_{\text{sp}} = 300\text{ s}$ for monopropellant/bipropellant thrusters).

---

## 5. How to Run

### Prerequisites
- Python 3.10+
- Node.js v18+ / npm

### Step 1: Start Backend (FastAPI)
```bash
# Set PYTHONPATH to backend directory
$env:PYTHONPATH="backend"  # PowerShell
# or export PYTHONPATH=backend (Linux/macOS)

# Run backend test suite to verify mechanics calculations
python -m pytest backend/tests -v

# Start FastAPI server on port 8000
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 2: Start Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Hackathon Demo Walkthrough (2-Minute Demo)

1. Click **"HACKATHON DEMO MODE"** on the top dashboard bar.
2. The platform automatically loads **Scenario 4 (Multi-Debris Master Scenario)**.
3. Observe **10 tracked space debris objects** surrounding the satellite in 3D Cesium Earth view.
4. Conjunction analysis highlights **Cosmos-1408 Fragment #401** as a **CRITICAL THREAT** (Miss distance: ~190m, Risk Score: 85.4%, TCA within 20 mins).
5. Inspect the **Trajectory Separation Graph** showing distance diving into the 500m danger sphere.
6. The system automatically executes the **Maneuver Optimizer**, selecting the energy-optimal **+Transverse (+In-Track)** burn of **0.50 m/s ΔV**.
7. Observe the **Lime Dashed Avoidance Trajectory** in 3D Cesium View and updated graph showing miss distance expanding $> 5.0\text{ km}$ and risk dropping to **LOW**.

---

## 7. Known Limitations & Future Enhancements
- **Spherical Gravitational Field**: Extends beyond J2 to include higher order geopotential harmonics (J3, J4) and atmospheric drag models (NRLMSISE-00).
- **Covariance Propagation**: Integration of full 6x6 state covariance propagation over time for non-linear covariance matrix transformations.
- **Flight Software Integration**: Exporting candidate burns in CCSDS OEM / OMM standard XML formats for satellite flight control ingestion.

---

## 8. License & Acknowledgments
Built for college hackathon demonstration using open-source astrodynamics principles (SGP4, WGS84, Keplerian astrodynamics).
