const canonicalSubjectNames: Record<string, string> = {
  INGG214: 'ANÁLISIS DE DATOS EN INGENIERÍA',
  IINF325: 'ASEGURAMIENTO DE LA CALIDAD DE SOFTWARE',
  IINF347: 'TENDENCIAS EN DESARROLLO DE SOFTWARE',
  IINF347L: 'LABORATORIO TENDENCIAS EN DESARROLLO DE SOFTWARE',
  ICSG202L: 'LABORATORIO DE ALGORITMOS MALICIOSOS',
  IINF325L: 'LABORATORIO ASEGURAMIENTO DE LA CALIDAD DE SOFTWARE',
};

function comparable(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleUpperCase('es');
}

/**
 * BeeCampus exposes some course descriptions through a fixed-width PeopleSoft
 * field and cuts them mid-word.  Expand only known prefixes so a future title
 * change from the portal is never silently replaced with unrelated catalog data.
 */
export function completeSubjectName(subjectCode: string, portalName: string) {
  const name = portalName.trim();
  const canonical = canonicalSubjectNames[subjectCode.replace(/\s+/g, '').toUpperCase()];
  if (!canonical || !comparable(canonical).startsWith(comparable(name))) return name;
  return canonical;
}
