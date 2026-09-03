# Deterministic Red-Flag & Triage Engine — MediKiosk

**Document Version:** 1.0.0 (Phase 0 Baseline)  
**Date:** September 2026  

---

## 1. Safety Architecture: Zero Probabilistic Triage

In an emergency medical setting, probabilistic AI models (LLMs) cannot be trusted as the sole decision-maker for life-threatening conditions due to inherent hallucination, non-determinism, and prompt fragility.

MediKiosk enforces a **strictly deterministic, rule-based red-flag evaluation engine**:
1. Structured symptoms gathered via touch or verified ASR slot extraction pass into a pure TypeScript/JSON rule engine.
2. Every rule is transparent, auditable, version-controlled, and authored directly from established emergency triage protocols (e.g., Emergency Severity Index, Manchester Triage System).
3. If an emergency combination is detected, the engine immediately elevates session priority, alerts triage staff, and transitions the kiosk into a supportive emergency guidance screen.

```
+-----------------------------------------------------------------------------------+
|                        STRUCTURED SYMPTOM SLOTS GATHERED                          |
|         { complaint: "CHEST_PAIN", character: "CRUSHING", diaphoresis: true }     |
+------------------------------------------|----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                       DETERMINISTIC RED-FLAG RULE EVALUATOR                       |
|                                                                                   |
|  Rule ACS_001: IF (complaint == CHEST_PAIN && character == CRUSHING &&           |
|                    diaphoresis == true)                                           |
|                THEN SEVERITY = 'CRITICAL'                                         |
+------------------------------------------|----------------------------------------+
                                           |
                                           +---> [Staff Triage Alert via WebSocket]
                                           |
                                           +---> [Audit Log Entry Created]
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                     CALM, NON-DIAGNOSTIC PATIENT NOTIFICATION                     |
|                                                                                   |
|  "We have detected potentially urgent symptoms that require immediate clinical    |
|   attention. Our nursing staff has been notified and is coming to assist you."     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Red-Flag Rule Schema Definition

```typescript
export type AlertSeverity = "CRITICAL" | "URGENT" | "ELEVATED" | "INFO";

export interface RuleConditionClause {
  fieldPath: string;                      // e.g., "hpi.socrates.character.value"
  operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "IN_LIST" | "GREATER_THAN" | "LESS_THAN" | "BOOLEAN_TRUE";
  expectedValue: any;
}

export interface RedFlagRule {
  ruleId: string;                         // e.g., "RULE_ACS_001"
  ruleName: string;
  category: "CARDIOLOGY" | "NEUROLOGY" | "RESPIRATORY" | "GASTROENTEROLOGY" | "SEPSIS" | "ALLERGY";
  severity: AlertSeverity;
  logicalOperator: "AND" | "OR";          // Condition joining strategy
  conditions: RuleConditionClause[];
  patientMessageTemplate: Record<string, string>; // Multi-lingual calm guidance
  staffAlertSummary: string;              // Clinical summary for nurse dashboard
  recommendedTriageAction: "IMMEDIATE_EMERGENCY_BAY" | "PRIORITY_DOCTOR_QUEUE" | "NURSE_VITALS_CHECK";
  clinicalReference: string;              // e.g., "AHA/ACC 2021 Acute Chest Pain Guidelines"
}
```

---

## 3. Core Baseline Red-Flag Rules Library (Phase 0)

| Rule ID | Category | Severity | Trigger Conditions (Structured Slots) | Staff Alert Summary | Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `RULE_ACS_001` | Cardiology | `CRITICAL` | `complaint == "CHEST_PAIN"` AND `character IN ["CRUSHING", "HEAVY_PRESSURE"]` AND `(diaphoresis == true OR radiation CONTAINS "LEFT_ARM")` | **Suspected Acute Coronary Syndrome (ACS)** — Immediate 12-lead ECG & cardiac bay transfer | Immediate Emergency Bay |
| `RULE_STROKE_001` | Neurology | `CRITICAL` | `(facialDroop == true OR armWeakness == true OR speechSlurred == true)` AND `acuteOnset == true` | **Suspected Acute Ischemic Stroke (FAST Protocol)** — Time-sensitive thrombolysis window | Immediate Emergency Bay |
| `RULE_MENINGISM_001` | Neurology | `URGENT` | `complaint == "FEVER"` AND `neckStiffness == true` AND `alteredSensorium == true` | **Suspected Bacterial Meningitis / Encephalitis** | Immediate Nurse Vitals & Isolation |
| `RULE_GI_BLEED_001` | Gastroenterology | `URGENT` | `hematemesis == true` (vomiting blood) OR `melena == true` (black tarry stools) | **Active Upper/Lower GI Hemorrhage** — Risk of hypovolemic shock | Priority Doctor Queue + IV Access |
| `RULE_RESP_FAIL_001` | Respiratory | `CRITICAL` | `complaint == "BREATHLESSNESS"` AND `stridor == true` OR `inabilityToSpeakFullSentences == true` | **Severe Acute Respiratory Distress** — Immediate airway & SpO2 assessment | Immediate Emergency Bay |
| `RULE_ANAPHYLAXIS_001`| Allergy | `CRITICAL` | `acuteUrticaria == true` AND `(lipTongueSwelling == true OR wheezingDyspnea == true)` | **Suspected Anaphylactic Reaction** — Prepare IM Epinephrine | Immediate Emergency Bay |
| `RULE_SEPSIS_001` | Sepsis | `URGENT` | `complaint == "FEVER"` AND `shiveringRigors == true` AND `confusionAlteredSensorium == true` | **Suspected Sepsis (qSOFA criteria positive)** | Priority Doctor Queue + Vitals |

---

## 4. Patient Communication Guidelines (Anti-Panic Messaging)

> [!CAUTION]
> **Strict Non-Diagnostic Communication Rule:**  
> The kiosk interface must **NEVER** issue a diagnostic statement to the patient (e.g., *"You are having a heart attack"* or *"You have a stroke"*). Such statements induce acute panic, exacerbate hypertensive episodes, and violate clinical medical device guidelines.

### Standardized Patient-Facing Phrasing
- **Hindi (`hi-IN`):**  
  *"हमने आपके लक्षणों में कुछ महत्वपूर्ण संकेत पाए हैं, जिन पर तुरंत ध्यान देना आवश्यक है। हमारे नर्सिंग स्टाफ को सूचित कर दिया गया है और वे तुरंत आपकी सहायता के लिए आ रहे हैं। कृपया यहाँ आराम से बैठें।"*
- **Marathi (`mr-IN`):**  
  *"तुमच्या लक्षणांमध्ये त्वरित लक्ष देण्याची गरज असलेले काही महत्त्वाचे संकेत आढळले आहेत. आमच्या नर्सिंग कर्मचाऱ्यांना त्वरित माहिती दिली गेली आहे आणि ते तुमच्या मदतीसाठी येत आहेत. कृपया शांत बसावे."*
- **English (`en`):**  
  *"We have detected potentially urgent symptoms that require immediate clinical attention. Our hospital staff has been alerted and is coming to assist you right away. Please remain seated comfortably."*

---

## 5. Staff Triage Alerting & Audit Logging

When a rule fires:
1. **WebSocket Event:** An encrypted WebSocket event (`triage:alert:critical`) broadcasts instantly to the nurse station / triage supervisor tablet with the kiosk booth ID, patient name, and trigger details.
2. **Visual Kiosk Lock:** The kiosk UI halts standard questioning, displays the supportive nurse assistance screen, and prevents unauthorized restart until a staff badge/PIN unlocks it.
3. **Immutable Audit Record:** A `RedFlagEvaluationRecord` is permanently saved to PostgreSQL containing:
   - Rule ID and version
   - Snapshot of clinical slots evaluated
   - Timestamp to the millisecond
   - Staff member who acknowledged and cleared the alert
