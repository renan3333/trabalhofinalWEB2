import { conflict, notFound } from '../utils/AppError.js';

export function createInstrumentService({ instrumentRepository }) {
  const mustFind = async (id) => {
    const item = await instrumentRepository.findById(id);
    if (!item) throw notFound('Instrumento não encontrado');
    return item;
  };

  return {
    list: () => instrumentRepository.findAll(),
    getById: (id) => mustFind(id),

    async create(data) {
      if (await instrumentRepository.findByName(data.name)) {
        throw conflict('Já existe um instrumento com esse nome');
      }
      return instrumentRepository.create(data);
    },

    async update(id, data) {
      await mustFind(id);
      if (data.name) {
        const other = await instrumentRepository.findByName(data.name);
        if (other && other.id !== id) throw conflict('Já existe um instrumento com esse nome');
      }
      return instrumentRepository.update(id, data);
    },

    async remove(id) {
      await mustFind(id);
      if ((await instrumentRepository.countLessons(id)) > 0) {
        throw conflict('Instrumento possui aulas vinculadas e não pode ser removido');
      }
      await instrumentRepository.remove(id);
    },
  };
}
