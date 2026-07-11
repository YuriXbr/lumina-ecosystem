import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DefaultColumn from './components/DefaultColumn.jsx';
import DefaultInput from './components/DefaultInput.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import DefaultSelect from './components/DefaultSelect.jsx';
import DangerBadge from './components/DangerBadge.jsx';

const DashboardSettingsPage = () => {
  const [formData, setFormData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}expapi/v1/getConfigs`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const data = await response.json();
        setFormData(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [navigate]);

  const handleChange = (section, field, value) => {
    setFormData(prevState => ({
      ...prevState,
      [section]: {
        ...prevState[section],
        [field]: value
      }
    }));
  };

  const handleActivityChange = (field, value) => {
    setFormData(prevState => ({
      ...prevState,
      bot: {
        ...prevState.bot,
        activity: {
          ...prevState.bot.activity,
          [field]: value
        }
      }
    }));
  };

  if (!formData.bot) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <h1 className='text-2xl font-semibold text-dark dark:text-slate-700'>CRITICO</h1>
      <section className='px-3 py-12 dark:bg-dark'>
        <div className='container'>
          <div className='-mx-4 flex flex-wrap gap-5'>
            <DefaultColumn>
              <DefaultInput
                label="Bot Token"
                className="bot-token"
                value={formData.bot.token || ''}
                onChange={(e) => handleChange('bot', 'token', e.target.value)}
                additionalComponent={<DangerBadge />}
              />
              <DefaultInput
                label="Client ID"
                className="client-id"
                value={formData.bot.clientId || ''}
                onChange={(e) => handleChange('bot', 'clientId', e.target.value)}
              />
              <DefaultInput
                label="Prefix"
                className="prefix"
                value={formData.bot.prefix || ''}
                onChange={(e) => handleChange('bot', 'prefix', e.target.value)}
              />
            </DefaultColumn>
            <DefaultColumn>
              <DefaultSelect
                label="Status"
                className="status"
                value={formData.bot.status || ''}
                onChange={(e) => handleChange('bot', 'status', e.target.value)}
                options={[
                  { value: 'online', label: 'Online' },
                  { value: 'dontdisturb', label: 'Ocupado' },
                  { value: 'away', label: 'Ausente' },
                  { value: 'invisible', label: 'Invisível' }
                ]}
              />
              <DefaultInput
                label="Activity Type"
                className="activity-type"
                value={formData.bot.activity.type || ''}
                onChange={(e) => handleActivityChange('type', e.target.value)}
              />
              <DefaultInput
                label="Activity Name"
                className="activity-name"
                value={formData.bot.activity.name || ''}
                onChange={(e) => handleActivityChange('name', e.target.value)}
              />
            </DefaultColumn>
            <DefaultColumn>
              <DefaultInput
                label="Devmode"
                className="devmode"
                value={formData.bot.devmode}
                onChange={(e) => handleChange('bot', 'devmode', e.target.checked)}
              />
            </DefaultColumn>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
};

export default DashboardSettingsPage;