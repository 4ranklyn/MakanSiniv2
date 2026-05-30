# MakanSini — The Hunger Protocol 🍜 ✨

[![Go Version](https://img.shields.io/badge/Go-1.25.5-blue.svg)](https://golang.org)
[![React Version](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev)
[![Vite Version](https://img.shields.io/badge/Vite-8-purple.svg)](https://vite.dev)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android_Native-green.svg)](https://capacitorjs.com)
[![AI Engine](https://img.shields.io/badge/LLM-Gemini_2.0_Flash-purple.svg)](https://deepmind.google/technologies/gemini/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**MakanSini** is an ultra-fast, cross-platform social journal and AI-powered recommendation client designed to instantly solve the universal "what should we eat today?" dilemma. By combining natural language semantic reasoning with strict, deterministic geospasial coordinates and dual-language localization, MakanSini delivers an optimized culinary matching experience in a sleek, glassmorphic swipe interface.

---

## 🚀 Key Engineering Moats & Core Features

### 1. Triple-Threat Recommendation Engine (Solo Mode)
MakanSini bypasses standard keyword-matching limitations by processing natural language food cravings through a robust, 5-stage server-side data pipeline:
* **Sustenance Vector Extraction:** Parses abstract user inputs (e.g., *"something warm, soupy, and budget-friendly for a rainy day"*) using `gemini-2.0-flash` into up to 3 optimized, high-signal search keywords while factoring in the user's historical *Taste Profile* weight.
* **Deterministic Spatial Search:** Executes high-accuracy geographic queries against the Google Places API (New) constrained strictly within the user's selected radius.
* **Haversine Spacial Filtering:** Instantly eliminates out-of-bounds restaurant candidates on the server using great-circle distance mathematical verification.
* **Semantic Reranking:** Leverages Gemini AI to dynamically assign conceptual relevance scores (0–10) checking how well a restaurant's menu matches the raw user mood.
* **Composite Scoring Formula:** Sorts and serves the Top 10 cards using a weighted multi-factor calculation:
  $$\text{Score} = (\text{Rating} \times 1.0) + (\text{ContextScore} \times 1.5) - (\text{Distance}_{\text{km}} \times 0.4)$$

### 2. Taste Timeline & AI Local Trends Engine
* **Anonymous Community Posting:** Users can publish culinary experiences instantly under a self-selected pseudonym Local Handle without navigating heavy, conversion-killing sign-in walls.
* **AI Smart Trend Analyst:** The backend continuously aggregates the latest 50 community reviews and feeds them into Gemini AI to generate a dynamic, 2-sentence local culinary trend summary complete with animated trend keyword pill chips.

### 3. End-to-End Internationalization (i18n)
* **Frontend:** Complete bilingual interface state support (**Bahasa Indonesia 🇮🇩 | English 🇬🇧**) built with `i18next` and persistent caching via `localStorage`.
* **Backend:** Adaptive AI prompts that scan incoming `Accept-Language` request headers, forcing the Gemini engine to output structural response summaries and tags in the user's active language choice.

### 4. Cross-Platform Native Android Compilation
* Fully wrapped using **Capacitor**, compiling web-optimized bundles straight into a native Gradle project workspace.
* Integrated environment-detection configurations to swap networking rules gracefully between local host network loops (`10.0.2.2:8080`) for emulators, explicit local Wi-Fi IPs for physical mobile debugging, and target cloud hosting URLs.

---

## 📦 Monorepo Directory Layout

```text
makansini_bwai/                  # Root Workspace
├── frontend/                     # React 19 + Vite 8 App (Glassmorphic System)
│   ├── src/components/           # UI Views (SwipeArena, SurveyView, CommunityView)
│   ├── src/config/api.js         # Adaptive API Base URL Config (Local/Android/Cloud)
│   ├── src/config/i18n.js        # Localization Dictionary Management (ID/EN)
│   └── android/                  # Native Android Studio project structure (Capacitor)
├── backend/                      # Go REST API Microservice (Clean Architecture)
│   ├── database/                 # SQLite + GORM Instance Engine (CGO-free)
│   ├── services/                 # External Integrations (Gemini GenAI SDK, Google Places)
│   └── main.go                   # Main Entrypoint & Guest Injection Context
└── .gitignore                    # Global environment & dependency guardrails

```

---

## 🛠️ Local Installation & Setup

### Prerequisites

* Go 1.25.5+
* Node.js v18+
* Android Studio (with Android SDK Platform-Tools & SDK 35+)

### 1. Fire Up the Go Backend

Navigate into the backend workspace, configure your Google Cloud Platform environments, and start the engine:

```bash
cd backend
go run main.go

```

*The API gateway will instantly boot up at `http://localhost:8080` and seed your standalone mock user profile database (`makansini.db`) automatically.*

### 2. Run the Frontend Web Client

Open a separate terminal instance, enter the frontend workspace, install packages, and boot the dev server:

```bash
cd frontend
npm install
npm run dev

```

*Access the rich user interface on your browser at `http://localhost:5173`.*

### 3. Compile and Launch Directly on a Physical Android Phone

Ensure **USB Debugging** is switched on in your smartphone's Developer Options, link it via USB, and run the sequential PowerShell script from the `frontend/` directory:

```powershell
cd frontend
npm run build
npx cap sync android
npx cap run android

```

*Select your active device path from the CLI prompt to build the Gradle asset pipeline and watch the application boot natively onto your phone screen.*

---

## 🧪 Comprehensive Verification Suite (100% PASS)

* **Backend Unit Verification (`go test ./...`):** Validates environment setup parsing, cross-origin resource sharing (CORS) rules, and mathematical Haversine geofence boundaries.
* **Frontend Runtime Verification (`npm run test`):** Ensures browser-side coordinate processing logic maintains strict synchronization integrity with spatial constraints.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 🏆 Core Architecture Lead

* **Jasson Franklyn Wang** — Informatics Undergraduate, Universitas Sebelas Maret (UNS), Surakarta, Indonesia.
