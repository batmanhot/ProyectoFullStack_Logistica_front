import React from 'react';

const StatCard = ({ title, value, icon, color }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                {icon}
            </div>
        </div>
    );
};

export default StatCard;