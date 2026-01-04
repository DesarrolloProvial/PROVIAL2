import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    administracionAPI,
    Rol,
    Permiso
} from '../../services/administracion.service';
import {
    Shield,
    Plus,
    Edit2,
    Trash2,
    X
} from 'lucide-react';

export default function RolesTab() {
    const queryClient = useQueryClient();
    const [modalRole, setModalRole] = useState<Rol | 'new' | null>(null);

    const { data: roles = [], isLoading: loadingRoles } = useQuery({
        queryKey: ['admin-roles'],
        queryFn: () => administracionAPI.getRoles().then(res => res.data),
    });

    const deleteMutation = useMutation({
        mutationFn: administracionAPI.deleteRol,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
        },
        onError: (err: any) => {
            alert(err.response?.data?.error || 'Error al eliminar rol');
        }
    });

    if (loadingRoles) return <div className="p-8 text-center text-gray-500">Cargando roles...</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-600" />
                        Roles y Permisos
                    </h3>
                    <button
                        onClick={() => setModalRole('new')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Rol
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                            <tr>
                                <th className="px-4 py-3">Nombre</th>
                                <th className="px-4 py-3">Descripción</th>
                                <th className="px-4 py-3">Permisos</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {roles.map((rol) => (
                                <tr key={rol.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">{rol.nombre}</td>
                                    <td className="px-4 py-3 text-gray-500 text-sm">{rol.descripcion || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {rol.permisos?.length || 0} permisos
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setModalRole(rol)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                title="Editar"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`¿Eliminar rol ${rol.nombre}? Esto podría afectar a usuarios asignados.`)) {
                                                        deleteMutation.mutate(rol.id);
                                                    }
                                                }}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalRole && (
                <RoleModal
                    role={modalRole === 'new' ? null : modalRole}
                    onClose={() => setModalRole(null)}
                    onSuccess={() => {
                        setModalRole(null);
                        queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
                    }}
                />
            )}
        </div>
    );
}

function RoleModal({ role, onClose, onSuccess }: { role: Rol | null; onClose: () => void; onSuccess: () => void }) {
    const isNew = !role;
    const [formData, setFormData] = useState({
        nombre: role?.nombre || '',
        descripcion: role?.descripcion || '',
        permisos_ids: role?.permisos?.map(p => p.id) || [] as number[]
    });

    // Get Permissions
    const { data: permisos = [] } = useQuery({
        queryKey: ['admin-permisos'],
        queryFn: () => administracionAPI.getPermisos().then(res => res.data)
    });

    // Group permissions
    const groupedPermisos = permisos.reduce((acc, p) => {
        const mod = p.modulo || 'OTROS';
        if (!acc[mod]) acc[mod] = [];
        acc[mod].push(p);
        return acc;
    }, {} as Record<string, Permiso[]>);

    const createMutation = useMutation({
        mutationFn: administracionAPI.createRol,
        onSuccess: () => {
            onSuccess();
        },
        onError: (err: any) => alert(err.response?.data?.error || 'Error creando rol')
    });

    const updateMutation = useMutation({
        mutationFn: () => administracionAPI.updateRol(role!.id, formData),
        onSuccess: () => {
            onSuccess();
        },
        onError: (err: any) => alert(err.response?.data?.error || 'Error actualizando rol')
    });

    const handleSubmit = () => {
        if (!formData.nombre) return alert('Nombre es requerido');
        if (isNew) createMutation.mutate(formData);
        else updateMutation.mutate();
    };

    const togglePermiso = (id: number) => {
        setFormData(prev => {
            const exists = prev.permisos_ids.includes(id);
            return {
                ...prev,
                permisos_ids: exists
                    ? prev.permisos_ids.filter(pid => pid !== id)
                    : [...prev.permisos_ids, id]
            };
        });
    };

    const toggleModule = (modulePermisos: Permiso[]) => {
        const allIds = modulePermisos.map(p => p.id);
        const allSelected = allIds.every(id => formData.permisos_ids.includes(id));

        setFormData(prev => {
            if (allSelected) {
                // Deselect all
                return { ...prev, permisos_ids: prev.permisos_ids.filter(id => !allIds.includes(id)) };
            } else {
                // Select all (add missing)
                const newIds = [...prev.permisos_ids];
                allIds.forEach(id => {
                    if (!newIds.includes(id)) newIds.push(id);
                });
                return { ...prev, permisos_ids: newIds };
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold">{isNew ? 'Nuevo Rol' : 'Editar Rol'}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                            <input
                                type="text"
                                value={formData.nombre}
                                onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="Ej: SUPERVISOR"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                            <input
                                type="text"
                                value={formData.descripcion}
                                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                placeholder="Descripción del rol"
                            />
                        </div>
                    </div>

                    <div>
                        <h4 className="font-medium text-gray-900 mb-3 block">Permisos</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(groupedPermisos).map(([modulo, perms]) => {
                                const allSelected = perms.every(p => formData.permisos_ids.includes(p.id));

                                return (
                                    <div key={modulo} className="border rounded-lg p-3 bg-gray-50">
                                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                                            <span className="font-semibold text-xs text-gray-500 uppercase tracking-wider">{modulo}</span>
                                            <button
                                                onClick={() => toggleModule(perms)}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                            >
                                                {allSelected ? 'Ninguno' : 'Todos'}
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {perms.map(p => (
                                                <label key={p.id} className="flex items-start gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.permisos_ids.includes(p.id)}
                                                        onChange={() => togglePermiso(p.id)}
                                                        className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                    />
                                                    <div>
                                                        <p className={`text-sm ${formData.permisos_ids.includes(p.id) ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                                            {p.nombre}
                                                        </p>
                                                        <p className="text-xs text-gray-400 group-hover:text-gray-500">{p.descripcion}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-100">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}
