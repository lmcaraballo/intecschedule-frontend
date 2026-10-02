import type { AcademicClass } from '../types/academic';
import { ClassCard } from './ClassCard';
import { ClassProgress } from './ClassProgress';
import { useState } from 'react';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { useAcademicSession } from '../app/AcademicLayout';

export function CurrentClassCard({ academicClass, now }: { academicClass: AcademicClass; now: Date }) {
  const [confirming, setConfirming] = useState(false);
  const { finishClassEarly } = useAcademicSession();
  return <section aria-labelledby="current-class-title"><h2 id="current-class-title" className="section-label">Clase en curso</h2><ClassCard academicClass={academicClass} eyebrow="Ahora"><ClassProgress academicClass={academicClass} now={now} /><Button variant="secondary" className="finish-class-button" onClick={() => setConfirming(true)}>Terminar clase ahora</Button></ClassCard>
    {confirming && <Dialog title="¿Terminaste esta clase?" className="confirmation-dialog finish-class-dialog" onClose={() => setConfirming(false)}>
      <div className="confirmation-dialog__lead"><span className="confirmation-dialog__icon"><Icon name="clock" /></span><div><p className="section-label">Solo para tu vista</p><p>Marcarás <strong>{academicClass.subjectName}</strong> como terminada antes de su hora programada.</p></div></div>
      <div className="confirmation-dialog__note"><Icon name="check" /><p><strong>Tu horario institucional no cambiará.</strong> Podrás seguir viendo esta clase y sus detalles cuando quieras.</p></div>
      <div className="dialog-actions"><Button variant="secondary" onClick={() => setConfirming(false)}>Seguir en clase</Button><Button onClick={() => { finishClassEarly(academicClass); setConfirming(false); }}>Marcar como terminada</Button></div>
    </Dialog>}
  </section>;
}
