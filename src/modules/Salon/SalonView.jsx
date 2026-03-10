import React from 'react';

const SalonView = ({ activeTab }) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="card shadow-md border-primary-light/20 dark:border-primary-dark/20">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-3 mb-2">
                    <span className="material-icons text-primary-light">storefront</span>
                    {activeTab === 'mantenimiento' ? 'Plan de mantenimiento' : 'Salón del Reino'}
                </h3>
                <p className="text-sm opacity-60">Gestión de instalaciones y mantenimiento.</p>
            </div>

            <div className="card shadow-md hover:shadow-lg transition-all group cursor-not-allowed opacity-60">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">Plan de mantenimiento</h3>
                    <span className="material-icons text-primary-light opacity-0 group-hover:opacity-100 transition-opacity">construction</span>
                </div>
                <p className="text-xs opacity-50">Sección en desarrollo. Estará disponible en futuras versiones.</p>
            </div>
        </div>
    );
};

export default SalonView;
