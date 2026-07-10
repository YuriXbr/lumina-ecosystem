import { useState, useEffect, useCallback } from 'react';
import {
  NewspaperIcon, PlusIcon, TrashIcon, ArrowPathIcon,
  ExclamationTriangleIcon, CheckIcon, XMarkIcon
} from '@heroicons/react/24/outline';
import { fetchNews, createNewsPost, deleteNewsPost } from '../../../utils/membersApi';
import { SkeletonLine } from '../../../components/ui/Skeleton';

const TAGS = [
  { value: 'novidade',    label: 'Novidade' },
  { value: 'atualizacao', label: 'Atualização' },
  { value: 'evento',      label: 'Evento' },
  { value: 'aviso',       label: 'Aviso' },
];

const TAG_STYLE = {
  novidade:    'bg-purple-100 text-purple-700',
  atualizacao: 'bg-blue-100 text-blue-700',
  evento:      'bg-yellow-100 text-yellow-700',
  aviso:       'bg-red-100 text-red-700',
};

export default function NewsAdminTab() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form de criação
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', excerpt: '', imageUrl: '', tag: 'novidade', pinned: false });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNews({ limit: 50 });
      setPosts(data.posts || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      setFormError('Título e corpo são obrigatórios');
      return;
    }
    setCreating(true);
    setFormError(null);
    try {
      await createNewsPost(form);
      setForm({ title: '', body: '', excerpt: '', imageUrl: '', tag: 'novidade', pinned: false });
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja remover este post?')) return;
    try {
      await deleteNewsPost(id);
      await load();
    } catch (err) {
      alert('Erro ao remover: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <NewspaperIcon className="h-5 w-5 text-purple-600" />
            Novidades do Bot
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Posts que aparecem no feed da Área de Membros</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-purple-700 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <button
            onClick={() => setShowForm(s => !s)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            {showForm ? <XMarkIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
            {showForm ? 'Cancelar' : 'Novo post'}
          </button>
        </div>
      </div>

      {/* Form de criação */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Criar nova novidade</h3>

          {formError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4" />
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={200}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Ex: Nova funcionalidade de maestria"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tag</label>
              <select
                value={form.tag}
                onChange={(e) => setForm(f => ({ ...f, tag: e.target.value }))}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {TAGS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Resumo (opcional)</label>
            <input
              type="text"
              value={form.excerpt}
              onChange={(e) => setForm(f => ({ ...f, excerpt: e.target.value }))}
              maxLength={300}
              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Texto curto exibido na sidebar (máx 300 chars)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Conteúdo *</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
              rows={5}
              className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono"
              placeholder="Conteúdo completo do post..."
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">URL da imagem (opcional)</label>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="https://..."
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) => setForm(f => ({ ...f, pinned: e.target.checked }))}
                  className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                📌 Fixar no topo
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-1 px-4 py-1.5 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {creating ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <CheckIcon className="h-4 w-4" />}
              Publicar
            </button>
          </div>
        </form>
      )}

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 flex items-center justify-between">
          <span>Erro ao carregar: {error}</span>
          <button onClick={load} className="text-red-700 underline text-xs">Tentar novamente</button>
        </div>
      )}

      {/* Lista de posts */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
              <SkeletonLine width="40%" height="0.9rem" />
              <SkeletonLine width="100%" height="0.7rem" />
              <SkeletonLine width="80%" height="0.7rem" />
            </div>
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
          <NewspaperIcon className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Nenhum post publicado ainda.</p>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="space-y-2">
          {posts.map(p => (
            <article key={p.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TAG_STYLE[p.tag] || TAG_STYLE.novidade}`}>
                      {p.tag}
                    </span>
                    {p.pinned && <span className="text-[10px] text-purple-600">📌 Fixado</span>}
                    <span className="text-[10px] text-gray-400">
                      {new Date(p.publishedAt).toLocaleString('pt-BR')}
                    </span>
                    {p.authorName && <span className="text-[10px] text-gray-400">por {p.authorName}</span>}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{p.title}</h3>
                  {p.excerpt && <p className="text-xs text-gray-500 mt-1">{p.excerpt}</p>}
                  <p className="text-xs text-gray-600 mt-2 line-clamp-3 whitespace-pre-wrap">{p.body}</p>
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      className="mt-2 max-h-32 rounded-md object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  )}
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Remover"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
