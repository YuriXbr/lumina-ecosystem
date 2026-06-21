import React from 'react';
import SkinCard from './SkinCard';

function SkinGrid({ filteredSkins }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {filteredSkins.map(skin => (
                <SkinCard key={skin.id} skin={skin} />
            ))}
        </div>
    );
}

export default SkinGrid;