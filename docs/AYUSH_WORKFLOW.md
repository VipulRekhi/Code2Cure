# AYUSH & Ayurvedic Clinical Intake Workflow — MediKiosk

**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Organization:** Ministry of Ayush / All India Institute of Ayurveda (AIIA)  
**Date:** September 2026  

---

## 1. Ayurvedic Intake Philosophy & Modular Separation

Ayurvedic case-taking involves a dual investigation:
1. **Roga Pariksha:** Examination of the disease entity (Nidana, Purvarupa, Rupa, Upashaya, Samprapti).
2. **Rogi Pariksha:** Examination of the patient's individual constitution and resilience, predominantly through the classical **Dashavidha Pariksha** (Ten-fold examination) and **Ashtavidha Pariksha** (Eight-fold clinical examination).

MediKiosk implements a **modular clinical architecture**:
- **Shared Infrastructure:** The kiosk user interface, speech recognition (ASR), TTS voice guidance, document OCR, and authentication are common across all modes.
- **Isolated Domain Schemas:** AYUSH question trees, clinical schemas, and summaries reside in dedicated modules (`src/modules/ayush/`), avoiding inappropriate mixing with conventional allopathic terminology while supporting a unified hybrid timeline.

```
+-----------------------------------------------------------------------------------+
|                        MEDIKIOSK COMMON KIOSK INTAKE LAYER                       |
|         (Registration • Language • Consent • Document Scan • Voice/Touch)          |
+-----------------------------------------------------------------------------------+
                                          |
                     +--------------------+--------------------+
                     |                                         |
                     v                                         v
+------------------------------------------+ +--------------------------------------+
|        ALLOPATHIC CLINICAL MODULE        | |        AYUSH / AYURVEDA MODULE       |
|  • Chief Complaint (SOCRATES/OPQRST)     | |  • Dashavidha Pariksha               |
|  • Review of Systems (ROS)               | |  • Ashtavidha Pariksha (Patient self)|
|  • ICD-10 / SNOMED Coding                | |  • Ahara-Vihara (Diet/Lifestyle)     |
|  • Allopathic Red Flags                  | |  • Agni & Kostha Assessment          |
|                                          | |  • NAMASTE / ICD-11 TM2 Coding       |
+------------------------------------------+ +--------------------------------------+
                     |                                         |
                     +--------------------+--------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        UNIFIED PHYSICIAN REVIEW DASHBOARD                         |
|      (Glanceable Allopathic + Ayurvedic Rogi/Roga SOAP Case Summary)              |
+-----------------------------------------------------------------------------------+
```

---

## 2. Dashavidha Pariksha (Ten-Fold Examination) Schema

```typescript
export interface DashavidhaParikshaRecord {
  // 1. Prakriti (Deha & Manasa Prakriti)
  prakriti: {
    dominantDosha: "VATA" | "PITTA" | "KAPHA" | "VATA_PITTA" | "PITTA_KAPHA" | "VATA_KAPHA" | "TRIDOSHAJA";
    assessedViaQuestionnaire: boolean;
    confidenceScore: number;
  };
  
  // 2. Vikriti (Current Doshic Imbalance)
  vikriti: {
    vitiatedDoshas: Array<"VATA" | "PITTA" | "KAPHA">;
    vitiatedDhatus?: Array<"RASA" | "RAKTA" | "MAMSA" | "MEDA" | "ASTHI" | "MAJJA" | "SHUKRA">;
    clinicalManifestation: string;
  };
  
  // 3. Sara (Tissue Essence / Constitutional Strength)
  sara: "PRAVARA_HIGH" | "MADHYAMA_MEDIUM" | "AVARA_LOW";
  
  // 4. Samhanana (Body Compactness & Musculoskeletal Symmetry)
  samhanana: "SUSAMHATA_COMPACT" | "MADHYAMA_MODERATE" | "HINA_POOR";
  
  // 5. Pramana (Anthropometric Proportions / BMI / Frame)
  pramana: {
    heightCm: number;
    weightKg: number;
    bmi: number;
    bodyFrame: "LEAN" | "MEDIUM" | "HEAVY";
  };
  
  // 6. Satmya (Habituation & Dietary/Climatic Adaptability)
  satmya: "SARVA_RASA_ALL_TASTES" | "EKA_RASA_SINGLE_TASTE" | "MADHYAMA";
  
  // 7. Sattva (Mental Resilience & Psychological Constitution)
  sattva: "PRAVARA_STRONG_MINDED" | "MADHYAMA_MODERATE" | "AVARA_FRAGILE_ANXIOUS";
  
  // 8. Ahara Shakti (Digestive Capacity)
  aharaShakti: {
    abhyavaharanaShakti: "HIGH_INTAKE" | "MODERATE_INTAKE" | "LOW_INTAKE"; // Quantity ingested
    jaranaShakti: "RAPID_DIGESTION" | "NORMAL_TIMELY" | "SLOW_DELAYED";    // Rate of digestion
    agniType: "VISHAMAGNI" | "TIKSHNAGNI" | "MANDAGNI" | "SAMAGNI";
  };
  
  // 9. Vyayama Shakti (Physical Exercise Endurance & Stamina)
  vyayamaShakti: "PRAVARA_HIGH" | "MADHYAMA_MODERATE" | "AVARA_LOW";
  
  // 10. Vaya (Chronological & Biological Age Group)
  vaya: "BALYA_CHILDHOOD" | "MADHYAMA_ADULTHOOD" | "VRIDDHA_GERIATRIC";
}
```

---

## 3. Ashtavidha Pariksha (Self-Reported Components)

While physical pulse reading (*Nadi Pariksha*) and deep tongue inspection (*Jihva Pariksha*) are conducted directly by the Vaidya in the consultation room, MediKiosk captures structured patient-reported baseline cues:

```typescript
export interface AshtavidhaSelfReportRecord {
  mutra: {                                // Urine
    frequencyDay: number;
    frequencyNight: number;
    color: "CLEAR_PALE" | "YELLOW_TURMERIC" | "DARK_REDDISH" | "CLOUDY";
    burningSensation: boolean;
  };
  mala: {                                 // Stool / Bowel
    frequency: number;
    consistency: "HARD_DRY_CONSTIPATED" | "SEMISOLID_FORMED" | "LOOSE_WATERY" | "STICKY_WITH_MUCUS_AMA";
    kostha: "KRURA_HARD" | "MADHYAMA_MODERATE" | "MRIDU_SOFT";
    foulOdourPresent: boolean;
  };
  jihva: {                                // Tongue Coating
    coatingStatus: "COATED_WHITE_AMA" | "COATED_YELLOWISH" | "CLEAN_PINK" | "DRY_CRACKED";
    tasteInMouth: "BITTER_TIKTA" | "SWEET_MADHURA" | "SOUR_AMLA" | "ASTRINGENT_KASHAYA" | "TASTELESS";
  };
  nidra: {                                // Sleep Pattern
    durationHours: number;
    quality: "SOUND_RESTFUL" | "DISTURBED_INSOMNIA" | "EXCESSIVE_DROWSY";
    daytimeSleepiness: boolean;
  };
  sweda: {                                // Perspiration
    level: "PROFUSE" | "MODERATE" | "SCANTY_ABSENT";
    bodyOdour: boolean;
  };
}
```

---

## 4. Ahara-Vihara (Dietary & Lifestyle) Question Engine

The Ayurvedic question flow engages the patient in a guided, conversational inquiry into their daily regimen:
1. **Ahara Patterns (Diet):** Dominant tastes (*Shad Rasa* preference), cold vs warm food preference, timing regularity (*Kala Bhojana*), consumption of incompatible foods (*Viruddha Ahara*, e.g., milk with sour fruits/fish).
2. **Vihara Patterns (Lifestyle):** Late-night waking (*Ratri Jagarana*), day sleeping (*Diva Swapna*), suppression of natural urges (*Vega Dharana*, e.g., urination, defecation, hunger, sleep).
3. **Manasika Nidana (Psychological Factors):** Stress, anger (*Krodha*), grief (*Shoka*), anxiety (*Chinta*).

---

## 5. Coding & Interoperability (NAMASTE & ICD-11 TM2)

MediKiosk prepares Ayurvedic clinical records for integration with:
- **National AYUSH Morbidity and Standardized Terminologies Electronic (NAMASTE) Portal:** Standardized terminologies for Ayurvedic diseases, Prakriti traits, and therapeutic procedures (*Panchakarma*).
- **WHO ICD-11 Traditional Medicine Module 2 (TM2):** Dual-coding diagnoses under both conventional ICD-10/11 and Ayurvedic nosology for research and clinical records.
