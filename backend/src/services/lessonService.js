import { badRequest, conflict, forbidden, notFound, unprocessable } from '../utils/AppError.js';
import { SLOTS } from '../validators/schemas.js';

export function createLessonService({
  lessonRepository,
  userRepository,
  instrumentRepository,
  now = () => new Date(), // injetável para facilitar testes
}) {
  const isPast = (date, time) => {
    const today = now().toISOString().slice(0, 10);
    const hhmm = now().toISOString().slice(11, 16);
    return date < today || (date === today && time <= hhmm);
  };

  const mustFind = async (id) => {
    const lesson = await lessonRepository.findById(id);
    if (!lesson) throw notFound('Aula não encontrada');
    return lesson;
  };

  const isParticipant = (actor, lesson) =>
    actor.role === 'ADMIN' || lesson.studentId === actor.id || lesson.teacherId === actor.id;

  const ensureNoConflict = async ({ teacherId, studentId, date, time, excludeId }) => {
    const found = await lessonRepository.findConflict({ teacherId, studentId, date, time, excludeId });
    if (found) {
      throw conflict(
        found.teacherId === teacherId
          ? 'O professor já tem uma aula nesse horário'
          : 'O aluno já tem uma aula nesse horário',
      );
    }
  };

  return {
    list(actor, filters = {}) {
      const scope =
        actor.role === 'ALUNO' ? { studentId: actor.id }
          : actor.role === 'PROFESSOR' ? { teacherId: actor.id }
            : {};
      return lessonRepository.list({ ...filters, ...scope });
    },

    async availability({ teacherId, date }) {
      const teacher = await userRepository.findById(teacherId);
      if (!teacher || teacher.role !== 'PROFESSOR') throw notFound('Professor não encontrado');
      const taken = new Set(await lessonRepository.takenTimes({ teacherId, date }));
      return SLOTS.map((time) => ({
        time,
        available: !taken.has(time) && !isPast(date, time),
      }));
    },

    async getById(actor, id) {
      const lesson = await mustFind(id);
      if (!isParticipant(actor, lesson)) throw forbidden();
      return lesson;
    },

    async create(actor, data) {
      let { teacherId, studentId } = data;
      if (actor.role === 'ALUNO') studentId = actor.id;
      if (actor.role === 'PROFESSOR') teacherId = actor.id;
      if (!teacherId) throw badRequest('Informe o professor (teacherId)');
      if (!studentId) throw badRequest('Informe o aluno (studentId)');

      const [teacher, student, instrument] = await Promise.all([
        userRepository.findById(teacherId),
        userRepository.findById(studentId),
        instrumentRepository.findById(data.instrumentId),
      ]);
      if (!teacher || teacher.role !== 'PROFESSOR') throw notFound('Professor não encontrado');
      if (!student || student.role !== 'ALUNO') throw notFound('Aluno não encontrado');
      if (!instrument) throw notFound('Instrumento não encontrado');

      if (isPast(data.date, data.time)) {
        throw unprocessable('Não é possível agendar aulas no passado');
      }
      await ensureNoConflict({ teacherId, studentId, date: data.date, time: data.time });

      return lessonRepository.create({
        date: data.date,
        time: data.time,
        notes: data.notes,
        teacherId,
        studentId,
        instrumentId: data.instrumentId,
      });
    },

    async update(actor, id, data) {
      const lesson = await mustFind(id);
      if (!isParticipant(actor, lesson)) throw forbidden();

      if (actor.role !== 'ADMIN' && lesson.status !== 'AGENDADA') {
        throw conflict('Apenas aulas agendadas podem ser alteradas');
      }
      if (actor.role === 'ALUNO') {
        // Aluno só pode cancelar ou editar observações.
        if (data.date || data.time || (data.status && data.status !== 'CANCELADA')) {
          throw forbidden('Alunos só podem cancelar a aula ou editar observações');
        }
      }

      const date = data.date ?? lesson.date;
      const time = data.time ?? lesson.time;
      const rescheduled = date !== lesson.date || time !== lesson.time;
      if (rescheduled) {
        if (isPast(date, time)) throw unprocessable('Não é possível reagendar para o passado');
        await ensureNoConflict({
          teacherId: lesson.teacherId, studentId: lesson.studentId, date, time, excludeId: id,
        });
      }
      return lessonRepository.update(id, data);
    },

    async remove(id) {
      await mustFind(id);
      await lessonRepository.remove(id);
    },
  };
}
