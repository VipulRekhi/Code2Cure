# Clinical Question Engine Architecture — MediKiosk

**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Date:** September 2026  

---

## 1. Core Architectural Principle: Separation of Intent from Phrasing

A foundational vulnerability of purely generative AI in healthcare intake is unpredictability—LLMs left in charge of an interview can omit vital clinical questions, ask irrelevant or repetitive queries, or drift off-course.

MediKiosk solves this by strictly separating:
1. **WHAT TO ASK (Clinical Question Engine):** A deterministic, medically validated Directed Acyclic Graph (DAG) / State Machine specifying which clinical parameters (slots) must be gathered based on the patient's chief complaint, age, gender, and prior answers.
2. **HOW TO ASK IT (LLM & Voice Layer):** The conversational layer renders the question node into natural vernacular speech, parses freeform patient audio responses, extracts the required slot values into structured types, and flags unparseable responses for touch fallback.

```
+-----------------------------------------------------------------------------------+
|                        CLINICAL QUESTION ENGINE (DETERMINISTIC)                   |
|                                                                                   |
|  [Active State Node] ---> [Evaluate Next Step] ---> [Required Slot Definition]    |
+-------------------------------------------------------------|---------------------+
                                                              |
                                                              v
+-----------------------------------------------------------------------------------+
|                       CONVERSATIONAL AI ADAPTER (PROBABILISTIC)                    |
|                                                                                   |
|  [Translate & Formulate Voice Prompt] <---> [IndicF5 TTS Audio Out]               |
|                                                                                   |
|  [Patient Speaks: IndicConformer ASR] ---> [Qwen2.5 LLM Zero-Shot Slot Extractor]  |
|                                                                                   |
|  [Extracted JSON Slot Value] ---------> [Zod Type Validation & Confidence Check]   |
+-------------------------------------------------------------|---------------------+
                                                              |
                                                              v
+-----------------------------------------------------------------------------------+
|                     STATE TRANSITION & CLINICAL STORE (DETERMINISTIC)             |
|                                                                                   |
|  [Persist Slot in History] ---> [Trigger Red-Flag Gate] ---> [Advance Graph Node]  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Question Node Definition Schema

All clinical question trees are defined as JSON/TypeScript schemas rather than hardcoded in UI components:

```typescript
export type QuestionNodeType = 
  | "SINGLE_CHOICE"
  | "MULTI_CHOICE"
  | "SLIDER_SCALE"
  | "BODY_MAP_SELECTOR"
  | "DURATION_PICKER"
  | "YES_NO_UNSURE"
  | "FREEFORM_VOICE_SLOT"
  | "DOCUMENT_PROMPT";

export interface QuestionOption {
  id: string;
  value: string;
  label: Record<string, string>;     // { en: "Crushing Pressure", hi: "सीने में भारी दबाव", mr: "छातीत दाब" }
  iconName?: string;
  audioPromptKey?: string;
  triggersRedFlag?: string;          // Red-Flag Rule ID if selected
}

export interface QuestionNode {
  id: string;                        // Unique Node Key (e.g., "CP_SOCRATES_CHARACTER")
  category: "CHIEF_COMPLAINT" | "HPI" | "PMHX" | "MEDICATION" | "ALLERGY" | "AYUSH";
  nodeType: QuestionNodeType;
  promptText: Record<string, string>; // Multi-lingual canonical phrasing
  slotTarget: string;                // Target field path in CanonicalClinicalHistory (e.g., "hpi.socrates.character")
  required: boolean;
  options?: QuestionOption[];
  minValue?: number;                 // e.g., 1 (for Pain scale)
  maxValue?: number;                 // e.g., 10
  validationSchemaKey: string;       // Zod validator key
  nextTransitions: {
    default: string;                 // Default next Node ID
    conditions?: Array<{
      operator: "EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN";
      value: any;
      targetNodeId: string;
    }>;
  };
}
```

---

## 3. Initial MVP Complaint-Specific Question Flows

The Phase 0 architecture defines complete structured flows for the top 5 outpatient complaints:

### 3.1 Flow 1: Chest Pain (`FLOW_CHEST_PAIN`)
1. **Site & Location (`CP_01`):** Retrosternal, Left-sided, Right-sided, Epigastric, Diffuse (Interactive Body Map / Voice).
2. **Onset (`CP_02`):** Sudden (<5 mins), Gradual hours, Chronic days/weeks.
3. **Character (`CP_03`):** Crushing/Heavy pressure, Sharp/Stabbing, Burning, Dull ache, Tearing.
4. **Radiation (`CP_04`):** Left arm/shoulder, Neck/Jaw, Back between shoulder blades, None.
5. **Associated Symptoms (`CP_05`):** Diaphoresis (cold sweats), Breathlessness (dyspnea), Nausea/vomiting, Palpitations, Dizziness/Syncope. *(Triggers immediate Red-Flag ACS_001 if crushing + sweat/radiation)*.
6. **Exacerbating / Relieving (`CP_06`):** Worse on exertion/walking, worse on deep breathing/coughing, relieved by rest.
7. **Severity Scale (`CP_07`):** Visual 1–10 slider.

### 3.2 Flow 2: Abdominal Pain (`FLOW_ABDOMINAL_PAIN`)
1. **Quadrant Location (`ABD_01`):** Right Upper (RUQ), Left Upper (LUQ), Right Lower (RLQ/Appendicular), Left Lower (LLQ), Epigastric, Periumbilical, Generalized.
2. **Character & Type (`ABD_02`):** Cramping/Colicky, Burning/Acidic, Constant severe ache.
3. **Relation to Food (`ABD_03`):** Empty stomach, immediately after fatty food, relieved by antacids.
4. **Bowel & Urinary Signs (`ABD_04`):** Vomiting, Black tarry stools (Melena), Blood in vomit (Hematemesis), Constipation with distension, Fever. *(Triggers Red-Flag ABD_GI_BLEED if Melena/Hematemesis)*.
5. **Radiation (`ABD_05`):** Radiating to back (Pancreatic pattern) or groin (Renal colic pattern).

### 3.3 Flow 3: Fever (`FLOW_FEVER`)
1. **Duration & Thermometry (`FEV_01`):** Number of days, measured temperature if known.
2. **Pattern (`FEV_02`):** Continuous high grade, intermittent with chills/rigors, evening rise.
3. **Associated Localizing Symptoms (`FEV_03`):** Cough/dyspnea (Respiratory), Burning micturition (UTI), Severe joint pain/rash (Arboviral/Dengue), Altered sensorium/neck stiffness (Meningeal/Red-Flag).
4. **Travel & Endemic History (`FEV_04`):** Travel to malaria/dengue endemic region or forest areas in last 14 days.

### 3.4 Flow 4: Cough (`FLOW_COUGH`)
1. **Duration & Type (`CGH_01`):** Acute (<3 weeks) vs Chronic (>3 weeks); Dry (non-productive) vs Wet (productive).
2. **Sputum Characteristics (`CGH_02`):** Clear/white, Yellow/green purulent, Rust-colored, Blood-tinged/Hemoptysis. *(Triggers Red-Flag RESP_HEMOPTYSIS)*.
3. **Breathlessness / Wheeze (`CGH_03`):** Presence of resting shortness of breath, audible wheezing, chest tightness.
4. **Constitutional Signs (`CGH_04`):** Night sweats, significant unintentional weight loss, loss of appetite.

### 3.5 Flow 5: Headache (`FLOW_HEADACHE`)
1. **Onset Velocity (`HA_01`):** "Thunderclap" instantaneous peak within seconds *(Triggers Critical Red-Flag SAH_001)* vs Gradual.
2. **Location (`HA_02`):** Unilateral throbbing (Migrainous), Bilateral band-like (Tension), Periorbital/facial (Sinus/Cluster).
3. **Associated Neurological Signs (`HA_03`):** Visual aura, photophobia, projectile vomiting, weakness in arm/leg, speech slurring, neck stiffness.

---

## 4. Voice Slot Extraction Engine

When a patient speaks rather than tapping the screen, the following pipeline executes:

```
[Spoken Vernacular Audio] 
          ↓ IndicConformer ASR
[Vernacular Transcript: "मुझको 2 दिन से बहुत तेज बुखार है और ठंड लग रही है"]
          ↓ LLM Slot Extraction Prompt (Qwen2.5-7B)
[Target Slot: { feverDurationDays: 2, chillsPresent: true, severity: "HIGH" }]
          ↓ Zod Validation
[Valid JSON Payload inserted into Clinical Session State]
```

### LLM Slot Extraction Prompt Template
```
You are a precise clinical information extractor in an Indian hospital kiosk.
Extract the patient's answers to the current question into strict JSON.
Current Question Target: {slotTarget}
Allowed Options / Schema: {validationSchema}

Patient Transcript: "{transcript}"
Language: "{language}"

Instructions:
1. Output ONLY valid JSON matching the schema.
2. Do not infer or invent facts not stated by the patient.
3. If the patient's response does not answer the question or is ambiguous, return {"status": "AMBIGUOUS", "extracted": null}.
4. If the patient denies the symptom, return {"status": "PRESENT", "value": false}.
```

---

## 5. Fallback & Ambiguity Strategies

1. **Low Confidence (< 0.70) or Ambiguous Speech:**
   - Kiosk gracefully re-prompts: *"I didn't quite catch that. Please select your answer on the screen below."*
   - UI instantly highlights the touch buttons corresponding to the options.
2. **Off-Topic Conversational Responses:**
   - The LLM identifies non-answers and the state machine retains the current node without progressing, playing an audio clarification.
3. **Silence / Timeout (15s):**
   - Kiosk plays a gentle audio reminder in the selected language and displays visual touch options.
