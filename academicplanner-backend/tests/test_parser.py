import pytest
from app.parser import parse_selection
from app.errors import ApiError

HEADERS=['Fila','ID','NOMBRE','PROGRAMA','DESCRIPCIÓN','CLAVE','SECCIÓN','ASIGNATURA','PROFESOR','CR','LUN','MAR','MIÉRC','JUE','VIER','SÁB','DOM','AULA']
ROW=['1','1234567','Estudiante ficticio','QA','Periodo de prueba','QA 202','02','Materia de prueba','Docente de prueba','4','','07:00-09:00','','07:00-09:00','','','','VIRTUAL']
def html(rows=None,headers=None):
    headers=headers or HEADERS
    return '<table><tr>'+''.join('<th>'+h+'</th>' for h in headers)+'</tr>'+''.join('<tr>'+''.join('<td>'+c+'</td>' for c in r)+'</tr>' for r in (rows if rows is not None else [ROW]))+'</table>'

def test_semantic_columns_and_stable_ids():
    a=parse_selection(html(),'1234567')
    order=list(range(len(HEADERS)))[::-1]
    b=parse_selection(html([[ROW[i] for i in order]],[HEADERS[i] for i in order]),'1234567')
    assert [c.model_dump() for c in a.classes]==[c.model_dump() for c in b.classes]
    assert [c.day for c in a.classes]==[2,4]
    assert a.classes[0].subjectCode=='QA202'
    assert a.classes[0].professor=='Docente de prueba'

@pytest.mark.parametrize('bad',['27:00-28:00','09:00-07:00','07:00-07:00','A Anunciar','texto','07:00-09:00 basura'])
def test_invalid_time_never_becomes_empty(bad):
    row=ROW.copy();row[11]=bad
    with pytest.raises(ApiError):parse_selection(html([row]),'1234567')

def test_multiple_times_and_am_pm():
    row=ROW.copy();row[11]='07:00AM-09:00AM<br>03:00PM-04:00PM'
    result=parse_selection(html([row]),'1234567')
    assert [c.startTime for c in result.classes]==['07:00','15:00','07:00']

@pytest.mark.parametrize('markup',[html([]),'<html>Error portal</html>',html([ROW,ROW]),html(headers=HEADERS[:-1]),'<input type="password">'])
def test_empty_changed_or_duplicate_response_rejected(markup):
    with pytest.raises(ApiError):parse_selection(markup,'1234567')

def test_wrong_student_rejected():
    with pytest.raises(ApiError):parse_selection(html(),'7654321')


def test_partial_pagination_is_not_accepted():
    with pytest.raises(ApiError):parse_selection(html()+'<p>Primero 1-1 de 8 Último</p>','1234567')
    assert len(parse_selection(html()+'<p>Primero 1-1 de 1 Último</p>','1234567').classes)==2


def test_course_without_weekly_times_preserved_alongside_timed_classes():
    row=ROW.copy();row[5]='QA 300';row[11]='';row[13]=''
    schedule=parse_selection(html([ROW,row])+'<p>Primero 1-2 de 2 Último</p>','1234567')
    assert len(schedule.classes)==2
    assert len(schedule.unscheduledSubjects)==1
    subject=schedule.unscheduledSubjects[0]
    assert subject.subjectCode=='QA300'
    assert subject.subjectName==row[7]
    assert subject.section==row[6]
    assert 'day' not in subject.model_dump()


def test_only_unscheduled_courses_is_not_missing_schedule():
    row=ROW.copy();row[11]='';row[13]=''
    schedule=parse_selection(html([row]),'1234567')
    assert schedule.classes==[]
    assert len(schedule.unscheduledSubjects)==1
