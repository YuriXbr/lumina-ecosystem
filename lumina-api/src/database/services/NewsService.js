const DatabaseService = require('./DataBaseService');
const { mongoSchema } = require('../schema');

/**
 * Serviço para o feed de novidades postado por administradores.
 * Posts são públicos (qualquer um pode ver, inclusive sem login).
 * Apenas staff (level 7+) pode criar/editar/remover.
 */
class NewsService extends DatabaseService {
    constructor() {
        super('newsPosts', mongoSchema.newsPosts);
    }

    /**
     * Valida que uma URL de imagem usa HTTPS (evita javascript: URLs e trackers HTTP).
     */
    _validateImageUrl(url) {
        if (!url) return '';
        const str = String(url).slice(0, 500);
        if (str && !str.startsWith('https://')) {
            throw new Error('URL da imagem deve usar HTTPS.');
        }
        return str;
    }

    /**
     * Lista posts publicados, ordenados por pinned desc + publishedAt desc.
     */
    async listPublished({ limit = 20, offset = 0 } = {}) {
        const safeLimit  = Math.min(Math.max(Number(limit) || 20, 1), 100);
        const safeOffset = Math.max(Number(offset) || 0, 0);
        return this.model
            .find({})
            .sort({ pinned: -1, publishedAt: -1 })
            .skip(safeOffset)
            .limit(safeLimit)
            .lean();
    }

    async getById(id) {
        if (!id) return null;
        return this.model.findById(id).lean();
    }

    async createPost({ title, body, excerpt, imageUrl, tag, pinned, authorEmail, authorName }) {
        if (!title || !body) throw new Error('title e body são obrigatórios');
        return this.create({
            title: String(title).slice(0, 200),
            body:  String(body),
            excerpt: excerpt ? String(excerpt).slice(0, 300) : '',
            imageUrl: this._validateImageUrl(imageUrl),
            tag: ['novidade', 'atualizacao', 'evento', 'aviso'].includes(tag) ? tag : 'novidade',
            pinned: !!pinned,
            publishedAt: new Date(),
            updatedAt: new Date(),
            authorEmail: authorEmail || '',
            authorName: authorName || '',
        });
    }

    /**
     * Atualiza um post — apenas campos whitelistados são aceitos.
     * Evita mass assignment (admin não pode sobrescrever authorEmail, _id, etc.).
     */
    async updatePost(id, updates) {
        if (!id) throw new Error('id é obrigatório');

        const ALLOWED = new Set(['title', 'body', 'excerpt', 'imageUrl', 'tag', 'pinned']);
        const safe = { updatedAt: new Date() };

        for (const key of Object.keys(updates || {})) {
            if (!ALLOWED.has(key)) continue;
            if (key === 'imageUrl') {
                safe.imageUrl = this._validateImageUrl(updates.imageUrl);
            } else if (key === 'title') {
                safe.title = String(updates.title).slice(0, 200);
            } else if (key === 'excerpt') {
                safe.excerpt = updates.excerpt ? String(updates.excerpt).slice(0, 300) : '';
            } else if (key === 'tag') {
                safe.tag = ['novidade', 'atualizacao', 'evento', 'aviso'].includes(updates.tag) ? updates.tag : 'novidade';
            } else if (key === 'pinned') {
                safe.pinned = !!updates.pinned;
            } else {
                safe[key] = updates[key];
            }
        }

        return this.model.findByIdAndUpdate(id, { $set: safe }, { new: true }).lean();
    }

    async deletePost(id) {
        if (!id) throw new Error('id é obrigatório');
        return this.model.deleteOne({ _id: id });
    }
}

module.exports = new NewsService();
