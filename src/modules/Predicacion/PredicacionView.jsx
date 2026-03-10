import React from 'react';

const PredicacionView = ({ activeTab }) => {
    const secciones = [
        { id: 'casa', nombre: 'De casa en casa' },
        { id: 'publica', nombre: 'Pública' },
        { id: 'telefonica', nombre: 'Telefónica' },
        { id: 'territorios', nombre: 'Territorios' }
    ];

    const currentSection = secciones.find(s => s.id === activeTab) || { nombre: 'Descripción General', id: 'all' };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="card shadow-md border-primary-light/20 dark:border-primary-dark/20">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-3 mb-2">
                    <span className="material-icons text-primary-light">campaign</span>
                    {currentSection.nombre}
                </h3>
                <p className="text-sm opacity-60">Gestiona aquí las actividades de {currentSection.nombre.toLowerCase()}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {secciones.map(sec => (
                    <div key={sec.id} className={`card shadow-md hover:shadow-lg transition-all group cursor-not-allowed ${activeTab === sec.id ? 'border-primary-light ring-1 ring-primary-light' : 'opacity-60'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold">{sec.nombre}</h3>
                            <span className="material-icons text-primary-light opacity-0 group-hover:opacity-100 transition-opacity">construction</span>
                        </div>
                        <p className="text-xs opacity-50">Sección en desarrollo. Estará disponible en futuras versiones.</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PredicacionView;
