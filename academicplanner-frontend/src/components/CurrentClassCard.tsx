import type { AcademicClass } from '../types/academic';
import { ClassCard } from './ClassCard';
import { ClassProgress } from './ClassProgress';
import { useState } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { useAcademicSession } from '../app/AcademicLayout';

export function CurrentClassCard({ academicClass, now }: { academicClass: AcademicClass; now: Date }) {
  const [confirming, setConfirming] = useState(false);
  const { finishClassEarly } = useAcademicSession();
  return <section aria-labelledby="current-class-title"><h2 id="current-class-title" className="section-label">Clase en curso</h2><ClassCard academicClass={academicClass} eyebrow="Ahora"><ClassProgress academicClass={academicClass} now={now} /><Button variant="secondary" className="finish-class-button" onClick={() => setConfirming(true)}>Terminar clase ahora</Button></ClassCard>
    {confirming && <Dialog title="Terminar clase ahora" onClose={() => setConfirming(false)}><p>Marcaremos esta clase como finalizada solo para ti. Tu horario institucional no cambiará.</p><div className="dialog-actions"><Button variant="secondary" onClick={() => setConfirming(false)}>Cancelar</Button><Button onClick={() => { finishClassEarly(academicClass); setConfirming(false); }}>Sí, ya terminé</Button></div></Dialog>}
  </section>;
}
