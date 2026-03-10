import React from 'react';

const InicioView = ({ anuncios }) => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card shadow-md">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                            <span className="material-icons text-primary-light">campaign</span>
                            Anuncios
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {anuncios.map(an => (
                            <div key={an.id} className="p-4 rounded-2xl bg-surface-light dark:bg-white/5 border border-outline-light/10">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black opacity-40 uppercase">{an.fecha}</span>
                                    {an.prioridad === 'Alta' && <span className="bg-error-light/10 text-error-light text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Importante</span>}
                                </div>
                                <p className="text-sm leading-relaxed">{an.contenido}</p>
                            </div>
                        ))}
                        {anuncios.length === 0 && (
                            <div className="text-center py-12 opacity-30 italic">No hay anuncios publicados.</div>
                        )}
                    </div>
                </div>

                <div className="card shadow-md flex flex-col justify-center items-center text-center p-12 bg-primary-light/5 dark:bg-primary-dark/5 border-dashed border-2 border-primary-light/20">
                    <span className="material-icons text-6xl text-primary-light/30 mb-4">dashboard_customize</span>
                    <h3 className="text-lg font-bold opacity-60">Personaliza tu tablero</h3>
                    <p className="text-xs opacity-40 max-w-[250px] mt-2">Próximamente podrás añadir widgets de resumen aquí.</p>
                </div>
            </div>
        </div>
    );
};

export default InicioView;
