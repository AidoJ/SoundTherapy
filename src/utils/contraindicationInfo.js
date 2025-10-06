/**
 * Contraindication Information for Vibroacoustic Therapy
 * Why certain conditions are not suitable for this treatment
 */

export const contraindicationInfo = {
  pacemaker: {
    title: "Pacemakers/Implants",
    text: "Powerful magnets in the speakers can interfere with pacemakers, ICDs (Implantable Cardioverter Defibrillators), deep brain stimulators, or other metal implants. This interference could potentially cause device malfunction or discomfort."
  },
  dvt: {
    title: "Deep Vein Thrombosis (DVT)",
    text: "The vibrations could potentially dislodge a blood clot, which may lead to serious complications such as pulmonary embolism. If you have DVT or a history of blood clots, vibroacoustic therapy is not recommended."
  },
  bleeding: {
    title: "Bleeding Disorders",
    text: "The vibrations can affect circulation, which is not advisable for individuals with bleeding disorders such as hemophilia or von Willebrand disease. This could increase the risk of bleeding complications."
  },
  surgery: {
    title: "Recent Surgery/Open Wounds",
    text: "The therapy can reduce blood clotting necessary for healing. If you have recently undergone surgery or have open wounds, the vibrations may interfere with the natural healing process and increase bleeding risk."
  },
  hypotension: {
    title: "Severe Low Blood Pressure (Hypotension)",
    text: "Vibroacoustic therapy may cause a further reduction in blood pressure, leading to lethargy, dizziness, or fainting. If you have severe low blood pressure, this therapy is contraindicated."
  },
  epilepsy: {
    title: "Seizure Disorders (Epilepsy)",
    text: "The sounds and vibrations may trigger or exacerbate seizures in individuals with epilepsy or other seizure disorders. The specific frequencies and rhythmic patterns could act as seizure triggers."
  },
  inflammatory: {
    title: "Acute Inflammatory Conditions",
    text: "The therapy could worsen conditions like acute rheumatoid arthritis or other acute inflammatory conditions. Vibrations may increase inflammation and pain during acute flare-ups."
  },
  psychotic: {
    title: "Psychotic Conditions",
    text: "There's a potential to provoke feelings of insecurity, paranoia, or exacerbate symptoms in individuals with psychosis or severe mental health conditions. The sensory experience may be overwhelming or triggering."
  },
  pregnancy: {
    title: "Pregnancy",
    text: "Due to limited research and potential effects on the fetus, vibroacoustic therapy is generally contraindicated during pregnancy, especially during the first trimester. The impact of low-frequency vibrations on fetal development has not been adequately studied."
  }
};

/**
 * Get contraindication info by key
 * @param {string} key - Contraindication key
 * @returns {Object} Contraindication information
 */
export const getContraindicationInfo = (key) => {
  return contraindicationInfo[key] || null;
};

/**
 * Get all contraindication keys
 * @returns {Array<string>} Array of all contraindication keys
 */
export const getAllContraindications = () => {
  return Object.keys(contraindicationInfo);
};

/**
 * Check if any contraindications are present
 * @param {Array<string>} selectedConcerns - Array of selected health concerns
 * @returns {boolean} True if contraindications found (excluding "none")
 */
export const hasContraindications = (selectedConcerns) => {
  if (!selectedConcerns || selectedConcerns.length === 0) return false;
  if (selectedConcerns.includes('none')) return false;
  return selectedConcerns.length > 0;
};

/**
 * Get severity level for contraindications
 * @param {string} key - Contraindication key
 * @returns {string} Severity level: "critical", "high", "moderate"
 */
export const getContraindicationSeverity = (key) => {
  const critical = ['pacemaker', 'dvt', 'bleeding', 'epilepsy'];
  const high = ['surgery', 'hypotension', 'pregnancy'];
  const moderate = ['inflammatory', 'psychotic'];

  if (critical.includes(key)) return 'critical';
  if (high.includes(key)) return 'high';
  if (moderate.includes(key)) return 'moderate';
  return 'low';
};
