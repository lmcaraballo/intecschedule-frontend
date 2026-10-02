import { isVirtualLocation, scheduledLocationLabel } from '../features/schedule/classLocation';
import { Button } from './Button';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import type { AcademicClass } from '../types/academic';
import { getSubjectColor } from '../features/schedule/subjectColor';
import { formatTime } from '../utils/dateFormat';
import { Icon } from './Icon';

interface ClassCardProps {
  academicClass: AcademicClass;
  eyebrow?: string | undefined;
  children?: ReactNode;
  compact?: boolean;
}

export function ClassCard({ academicClass: item, eyebrow, children, compact = false }: ClassCardProps) {
  const [params, setParams] = useSearchParams();
  const virtual = isVirtualLocation(item.location);
  function openDetail() {
    const next = new URLSearchParams(params);
    next.set('class', item.id);
    setParams(next, { preventScrollReset: true });
  }
  return <article className={`class-card${compact ? ' class-card--compact' : ''}`} data-subject={getSubjectColor(item.subjectCode)}>
    <Button variant="plain" type="button" className="class-card__button" onClick={openDetail} aria-label={`Ver detalle: ${item.subjectName}, ${formatTime(item.startTime)}${virtual ? ', encuentro virtual' : ''}`}>
      <span className="class-card__top"><span className="subject-code">{item.subjectCode} <span>· {item.section || 'Sección no informada'}</span></span>{(virtual || eyebrow) && <span className="class-card__badges">{virtual && <span className="class-badge class-badge--virtual">Virtual</span>}{eyebrow && <span className="class-badge">{eyebrow}</span>}</span>}<Icon name="chevron-right" width="16" height="16" /></span>
      <span className="class-card__name">{item.subjectName}</span>
      <span className="class-card__meta"><Icon name="clock" width="16" height="16" /><span>{formatTime(item.startTime)} – {formatTime(item.endTime)}</span></span>
      <span className="class-card__meta"><Icon name="pin" width="16" height="16" /><span>{scheduledLocationLabel(item.location)}</span></span>
    </Button>
    {children && <div className="class-card__extra">{children}</div>}
  </article>;
}
