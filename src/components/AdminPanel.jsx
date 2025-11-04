import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import BookingList from './BookingList';
import './AdminPanel.css';

const AdminPanel = ({ onLogout, onStartSession }) => {
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [frequencies, setFrequencies] = useState([]);
  const [audioFiles, setAudioFiles] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Audio file upload form state
  const [audioForm, setAudioForm] = useState({
    file: null,
    frequency_min: '',
    frequency_max: '',
    primary_intentions: '',
    healing_properties: '',
    harmonic_connections: '',
    frequency_family: ''
  });

  // Form states
  const [clientForm, setClientForm] = useState({
    first_name: '',
    surname: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: ''
  });

  const [frequencyForm, setFrequencyForm] = useState({
    frequency_hz: '',
    name: '',
    description: '',
    benefits: ''
  });

  const [serviceForm, setServiceForm] = useState({
    service_name: '',
    service_type: 'Vibro Acoustic Therapy',
    description: '',
    duration_minutes: '',
    price_cents: '',
    icon_emoji: '🎵',
    is_active: true,
    display_order: 0
  });

  useEffect(() => {
    if (activeTab === 'clients') fetchClients();
    if (activeTab === 'sessions') fetchSessions();
    if (activeTab === 'frequencies') fetchFrequencies();
    if (activeTab === 'audio') fetchAudioFiles();
    if (activeTab === 'services') fetchServices();
  }, [activeTab]);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  const fetchSessions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        clients (first_name, surname, email)
      `)
      .order('session_date', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  const fetchFrequencies = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('frequencies')
      .select('*')
      .order('frequency_hz', { ascending: true });

    if (error) {
      console.error('Error fetching frequencies:', error);
    } else {
      setFrequencies(data || []);
    }
    setLoading(false);
  };

  const fetchAudioFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audio_files')
      .select('*')
      .order('frequency_min', { ascending: true });

    if (error) {
      console.error('Error fetching audio files:', error);
    } else {
      setAudioFiles(data || []);
    }
    setLoading(false);
  };

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('service_type', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching services:', error);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('clients')
      .insert([clientForm]);

    if (error) {
      console.error('Error adding client:', error);
      alert('Error adding client: ' + error.message);
    } else {
      alert('Client added successfully!');
      setShowAddModal(false);
      setClientForm({
        first_name: '',
        surname: '',
        email: '',
        phone: '',
        date_of_birth: '',
        gender: ''
      });
      fetchClients();
    }
    setLoading(false);
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('clients')
      .update(clientForm)
      .eq('id', editingItem.id);

    if (error) {
      console.error('Error updating client:', error);
      alert('Error updating client: ' + error.message);
    } else {
      alert('Client updated successfully!');
      setEditingItem(null);
      setClientForm({
        first_name: '',
        surname: '',
        email: '',
        phone: '',
        date_of_birth: '',
        gender: ''
      });
      fetchClients();
    }
    setLoading(false);
  };

  const handleDeleteClient = async (id) => {
    if (!confirm('Are you sure you want to delete this client? This will also delete all their sessions.')) return;

    setLoading(true);
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting client:', error);
      alert('Error deleting client: ' + error.message);
    } else {
      alert('Client deleted successfully!');
      fetchClients();
    }
    setLoading(false);
  };

  const handleAddFrequency = async (e) => {
    e.preventDefault();
    setLoading(true);

    const benefitsArray = frequencyForm.benefits.split(',').map(b => b.trim());

    const { error } = await supabase
      .from('frequencies')
      .insert([{
        frequency_hz: parseInt(frequencyForm.frequency_hz),
        name: frequencyForm.name,
        description: frequencyForm.description,
        benefits: benefitsArray
      }]);

    if (error) {
      console.error('Error adding frequency:', error);
      alert('Error adding frequency: ' + error.message);
    } else {
      alert('Frequency added successfully!');
      setShowAddModal(false);
      setFrequencyForm({
        frequency_hz: '',
        name: '',
        description: '',
        benefits: ''
      });
      fetchFrequencies();
    }
    setLoading(false);
  };

  const handleUpdateFrequency = async (e) => {
    e.preventDefault();
    setLoading(true);

    const benefitsArray = frequencyForm.benefits.split(',').map(b => b.trim());

    const { error } = await supabase
      .from('frequencies')
      .update({
        frequency_hz: parseInt(frequencyForm.frequency_hz),
        name: frequencyForm.name,
        description: frequencyForm.description,
        benefits: benefitsArray
      })
      .eq('id', editingItem.id);

    if (error) {
      console.error('Error updating frequency:', error);
      alert('Error updating frequency: ' + error.message);
    } else {
      alert('Frequency updated successfully!');
      setEditingItem(null);
      setFrequencyForm({
        frequency_hz: '',
        name: '',
        description: '',
        benefits: ''
      });
      fetchFrequencies();
    }
    setLoading(false);
  };

  const handleDeleteFrequency = async (id) => {
    if (!confirm('Are you sure you want to delete this frequency?')) return;

    setLoading(true);
    const { error } = await supabase
      .from('frequencies')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting frequency:', error);
      alert('Error deleting frequency: ' + error.message);
    } else {
      alert('Frequency deleted successfully!');
      fetchFrequencies();
    }
    setLoading(false);
  };

  const editFrequency = (freq) => {
    setEditingItem(freq);
    setFrequencyForm({
      frequency_hz: freq.frequency_hz.toString(),
      name: freq.name,
      description: freq.description,
      benefits: Array.isArray(freq.benefits) ? freq.benefits.join(', ') : freq.benefits
    });
  };

  const handleAudioUpload = async (e) => {
    e.preventDefault();

    if (!audioForm.file) {
      alert('Please select an audio file');
      return;
    }

    setUploadingFile(true);

    try {
      // 1. Upload file to Supabase Storage
      const fileExt = audioForm.file.name.split('.').pop();
      const fileName = `${audioForm.frequency_range_min}Hz-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(filePath, audioForm.file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert('Error uploading file: ' + uploadError.message);
        setUploadingFile(false);
        return;
      }

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('audio-files')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 3. Insert record in audio_files table - matching exact DB schema
      const { error: dbError } = await supabase
        .from('audio_files')
        .insert([{
          file_name: audioForm.file.name,
          file_url: publicUrl,
          file_type: fileExt.toLowerCase(),
          frequency_min: parseInt(audioForm.frequency_min),
          frequency_max: parseInt(audioForm.frequency_max),
          primary_intentions: audioForm.primary_intentions.split(',').map(i => i.trim()),
          healing_properties: audioForm.healing_properties.split(',').map(p => p.trim()),
          harmonic_connections: audioForm.harmonic_connections ?
            audioForm.harmonic_connections.split(',').map(h => parseInt(h.trim())) : [],
          frequency_family: audioForm.frequency_family
        }]);

      if (dbError) {
        console.error('Database error:', dbError);
        alert('Error saving to database: ' + dbError.message);
      } else {
        alert('Audio file uploaded successfully!');
        setShowAddModal(false);
        setAudioForm({
          file: null,
          frequency_min: '',
          frequency_max: '',
          primary_intentions: '',
          healing_properties: '',
          harmonic_connections: '',
          frequency_family: ''
        });
        fetchAudioFiles();
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading file: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const editClient = (client) => {
    setEditingItem(client);
    setClientForm({
      first_name: client.first_name,
      surname: client.surname,
      email: client.email,
      phone: client.phone,
      date_of_birth: client.date_of_birth || '',
      gender: client.gender || ''
    });
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('services')
      .insert([{
        service_name: serviceForm.service_name,
        service_type: serviceForm.service_type,
        description: serviceForm.description,
        duration_minutes: parseInt(serviceForm.duration_minutes),
        price_cents: parseInt(serviceForm.price_cents),
        icon_emoji: serviceForm.icon_emoji,
        is_active: serviceForm.is_active,
        display_order: parseInt(serviceForm.display_order)
      }]);

    if (error) {
      console.error('Error adding service:', error);
      alert('Error adding service: ' + error.message);
    } else {
      alert('Service added successfully!');
      setShowAddModal(false);
      setServiceForm({
        service_name: '',
        service_type: 'Vibro Acoustic Therapy',
        description: '',
        duration_minutes: '',
        price_cents: '',
        icon_emoji: '🎵',
        is_active: true,
        display_order: 0
      });
      fetchServices();
    }
    setLoading(false);
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('services')
      .update({
        service_name: serviceForm.service_name,
        service_type: serviceForm.service_type,
        description: serviceForm.description,
        duration_minutes: parseInt(serviceForm.duration_minutes),
        price_cents: parseInt(serviceForm.price_cents),
        icon_emoji: serviceForm.icon_emoji,
        is_active: serviceForm.is_active,
        display_order: parseInt(serviceForm.display_order)
      })
      .eq('id', editingItem.id);

    if (error) {
      console.error('Error updating service:', error);
      alert('Error updating service: ' + error.message);
    } else {
      alert('Service updated successfully!');
      setEditingItem(null);
      setServiceForm({
        service_name: '',
        service_type: 'Vibro Acoustic Therapy',
        description: '',
        duration_minutes: '',
        price_cents: '',
        icon_emoji: '🎵',
        is_active: true,
        display_order: 0
      });
      fetchServices();
    }
    setLoading(false);
  };

  const handleDeleteService = async (id) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    setLoading(true);
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting service:', error);
      alert('Error deleting service: ' + error.message);
    } else {
      alert('Service deleted successfully!');
      fetchServices();
    }
    setLoading(false);
  };

  const editService = (service) => {
    setEditingItem(service);
    setServiceForm({
      service_name: service.service_name,
      service_type: service.service_type,
      description: service.description || '',
      duration_minutes: service.duration_minutes.toString(),
      price_cents: service.price_cents.toString(),
      icon_emoji: service.icon_emoji || '🎵',
      is_active: service.is_active,
      display_order: service.display_order.toString()
    });
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div className="admin-header-content">
          <div>
            <h1>Admin Panel</h1>
            <p>Manage your Sound Healing database</p>
          </div>
          {onLogout && (
            <button className="btn-logout" onClick={onLogout}>
              🚪 Logout
            </button>
          )}
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={activeTab === 'clients' ? 'active' : ''}
          onClick={() => setActiveTab('clients')}
        >
          Clients
        </button>
        <button
          className={activeTab === 'sessions' ? 'active' : ''}
          onClick={() => setActiveTab('sessions')}
        >
          Sessions
        </button>
        <button
          className={activeTab === 'frequencies' ? 'active' : ''}
          onClick={() => setActiveTab('frequencies')}
        >
          Frequencies
        </button>
        <button
          className={activeTab === 'audio' ? 'active' : ''}
          onClick={() => setActiveTab('audio')}
        >
          Audio Files
        </button>
        <button
          className={activeTab === 'services' ? 'active' : ''}
          onClick={() => setActiveTab('services')}
        >
          Services
        </button>
        <button
          className={activeTab === 'bookings' ? 'active' : ''}
          onClick={() => setActiveTab('bookings')}
        >
          Bookings
        </button>
      </div>

      <div className="admin-content">
        {loading && <div className="loading">Loading...</div>}

        {/* CLIENTS TAB */}
        {activeTab === 'clients' && (
          <div className="tab-content">
            <div className="tab-header">
              <h2>Clients ({clients.length})</h2>
              <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                + Add Client
              </button>
            </div>

            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>DOB</th>
                    <th>Gender</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(client => (
                    <tr key={client.id}>
                      <td>{client.first_name} {client.surname}</td>
                      <td>{client.email}</td>
                      <td>{client.phone}</td>
                      <td>{client.date_of_birth || 'N/A'}</td>
                      <td>{client.gender || 'N/A'}</td>
                      <td>
                        <button className="btn-edit" onClick={() => editClient(client)}>Edit</button>
                        <button className="btn-delete" onClick={() => handleDeleteClient(client.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SESSIONS TAB */}
        {activeTab === 'sessions' && (
          <div className="tab-content">
            <div className="tab-header">
              <h2>Sessions ({sessions.length})</h2>
            </div>

            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Frequency</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => (
                    <tr key={session.id}>
                      <td>{session.clients?.first_name} {session.clients?.surname}</td>
                      <td>{session.session_date}</td>
                      <td>{session.session_time}</td>
                      <td>{session.frequency_suggested} Hz</td>
                      <td>
                        <span className={`status-badge ${session.status}`}>
                          {session.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FREQUENCIES TAB */}
        {activeTab === 'frequencies' && (
          <div className="tab-content">
            <div className="tab-header">
              <h2>Frequencies ({frequencies.length})</h2>
              <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                + Add Frequency
              </button>
            </div>

            <div className="frequency-grid">
              {frequencies.map(freq => (
                <div key={freq.id} className="frequency-card" style={{ borderLeft: `4px solid ${freq.color}` }}>
                  <div className="freq-header">
                    <h3>{freq.frequency_hz} Hz</h3>
                    <div className="freq-actions">
                      <button className="btn-edit-small" onClick={() => editFrequency(freq)}>✏️</button>
                      <button className="btn-delete-small" onClick={() => handleDeleteFrequency(freq.id)}>×</button>
                    </div>
                  </div>
                  <h4>{freq.name}</h4>
                  <p>{freq.description}</p>
                  <div className="freq-meta">
                    <span>Chakra: {freq.chakra}</span>
                    <span>Benefits: {Array.isArray(freq.benefits) ? freq.benefits.join(', ') : freq.benefits}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AUDIO FILES TAB */}
        {activeTab === 'audio' && (
          <div className="tab-content">
            <div className="tab-header">
              <h2>Audio Files ({audioFiles.length})</h2>
              <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                + Upload Audio File
              </button>
            </div>

            <div className="audio-files-list">
              {audioFiles.length === 0 ? (
                <div className="empty-state">
                  <p>📁 No audio files yet</p>
                  <p>Upload MP3/WAV files to Supabase Storage bucket "audio-files"</p>
                  <p>Then add records here with frequency ranges and metadata</p>
                </div>
              ) : (
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>File Name</th>
                        <th>Frequency Range</th>
                        <th>Primary Intentions</th>
                        <th>Healing Properties</th>
                        <th>URL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audioFiles.map(audio => (
                        <tr key={audio.id}>
                          <td><strong>{audio.file_name}</strong></td>
                          <td>{audio.frequency_min} - {audio.frequency_max} Hz</td>
                          <td>
                            {Array.isArray(audio.primary_intentions)
                              ? audio.primary_intentions.join(', ')
                              : audio.primary_intentions || 'N/A'}
                          </td>
                          <td>
                            {Array.isArray(audio.healing_properties)
                              ? audio.healing_properties.join(', ')
                              : audio.healing_properties || 'N/A'}
                          </td>
                          <td>
                            <a href={audio.file_url} target="_blank" rel="noopener noreferrer" className="link-btn">
                              🔗 View
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="upload-instructions">
              <h3>📝 How to add audio files:</h3>
              <ol>
                <li>Go to Supabase Dashboard → Storage → "audio-files" bucket</li>
                <li>Upload your MP3/WAV file</li>
                <li>Copy the public URL</li>
                <li>Use SQL or Supabase UI to insert a record in "audio_files" table with:
                  <ul>
                    <li>file_name, file_url, frequency_min, frequency_max</li>
                    <li>primary_intentions (array), healing_properties (array)</li>
                    <li>harmonic_connections (array of related frequencies)</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* SERVICES TAB */}
        {activeTab === 'services' && (
          <div className="tab-content">
            <div className="tab-header">
              <h2>Services ({services.length})</h2>
              <button className="btn-primary" onClick={() => setShowAddModal(true)}>
                + Add Service
              </button>
            </div>

            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>Service Name</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Price</th>
                    <th>Icon</th>
                    <th>Active</th>
                    <th>Order</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(service => (
                    <tr key={service.id}>
                      <td><strong>{service.service_name}</strong></td>
                      <td>{service.service_type}</td>
                      <td>{service.duration_minutes} min</td>
                      <td>${(service.price_cents / 100).toFixed(2)}</td>
                      <td>{service.icon_emoji}</td>
                      <td>
                        <span className={`status-badge ${service.is_active ? 'active' : 'inactive'}`}>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{service.display_order}</td>
                      <td>
                        <button className="btn-edit" onClick={() => editService(service)}>Edit</button>
                        <button className="btn-delete" onClick={() => handleDeleteService(service.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BOOKINGS TAB */}
        {activeTab === 'bookings' && (
          <div className="tab-content">
            <BookingList onStartSession={onStartSession} />
          </div>
        )}
      </div>

      {/* ADD CLIENT MODAL */}
      {showAddModal && activeTab === 'clients' && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Add New Client</h2>
            <form onSubmit={handleAddClient}>
              <input
                type="text"
                placeholder="First Name"
                required
                value={clientForm.first_name}
                onChange={e => setClientForm({...clientForm, first_name: e.target.value})}
              />
              <input
                type="text"
                placeholder="Surname"
                required
                value={clientForm.surname}
                onChange={e => setClientForm({...clientForm, surname: e.target.value})}
              />
              <input
                type="email"
                placeholder="Email"
                required
                value={clientForm.email}
                onChange={e => setClientForm({...clientForm, email: e.target.value})}
              />
              <input
                type="tel"
                placeholder="Phone"
                required
                value={clientForm.phone}
                onChange={e => setClientForm({...clientForm, phone: e.target.value})}
              />
              <input
                type="date"
                placeholder="Date of Birth"
                value={clientForm.date_of_birth}
                onChange={e => setClientForm({...clientForm, date_of_birth: e.target.value})}
              />
              <select
                value={clientForm.gender}
                onChange={e => setClientForm({...clientForm, gender: e.target.value})}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
                <option value="Other">Other</option>
              </select>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLIENT MODAL */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Edit Client</h2>
            <form onSubmit={handleUpdateClient}>
              <input
                type="text"
                placeholder="First Name"
                required
                value={clientForm.first_name}
                onChange={e => setClientForm({...clientForm, first_name: e.target.value})}
              />
              <input
                type="text"
                placeholder="Surname"
                required
                value={clientForm.surname}
                onChange={e => setClientForm({...clientForm, surname: e.target.value})}
              />
              <input
                type="email"
                placeholder="Email"
                required
                value={clientForm.email}
                onChange={e => setClientForm({...clientForm, email: e.target.value})}
              />
              <input
                type="tel"
                placeholder="Phone"
                required
                value={clientForm.phone}
                onChange={e => setClientForm({...clientForm, phone: e.target.value})}
              />
              <input
                type="date"
                placeholder="Date of Birth"
                value={clientForm.date_of_birth}
                onChange={e => setClientForm({...clientForm, date_of_birth: e.target.value})}
              />
              <select
                value={clientForm.gender}
                onChange={e => setClientForm({...clientForm, gender: e.target.value})}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
                <option value="Other">Other</option>
              </select>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingItem(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Update Client</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD FREQUENCY MODAL */}
      {showAddModal && activeTab === 'frequencies' && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Add New Frequency</h2>
            <form onSubmit={handleAddFrequency}>
              <input
                type="number"
                placeholder="Frequency (Hz)"
                required
                value={frequencyForm.frequency_hz}
                onChange={e => setFrequencyForm({...frequencyForm, frequency_hz: e.target.value})}
              />
              <input
                type="text"
                placeholder="Frequency Name"
                required
                value={frequencyForm.frequency_name}
                onChange={e => setFrequencyForm({...frequencyForm, frequency_name: e.target.value})}
              />
              <textarea
                placeholder="Description"
                required
                value={frequencyForm.description}
                onChange={e => setFrequencyForm({...frequencyForm, description: e.target.value})}
              />
              <input
                type="text"
                placeholder="Benefits (comma-separated)"
                required
                value={frequencyForm.benefits}
                onChange={e => setFrequencyForm({...frequencyForm, benefits: e.target.value})}
              />
              <input
                type="text"
                placeholder="Chakra"
                value={frequencyForm.chakra}
                onChange={e => setFrequencyForm({...frequencyForm, chakra: e.target.value})}
              />
              <input
                type="text"
                placeholder="Color (hex code)"
                value={frequencyForm.color}
                onChange={e => setFrequencyForm({...frequencyForm, color: e.target.value})}
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Frequency</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FREQUENCY MODAL */}
      {editingItem && activeTab === 'frequencies' && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Edit Frequency</h2>
            <form onSubmit={handleUpdateFrequency}>
              <input
                type="number"
                placeholder="Frequency (Hz)"
                required
                value={frequencyForm.frequency_hz}
                onChange={e => setFrequencyForm({...frequencyForm, frequency_hz: e.target.value})}
              />
              <input
                type="text"
                placeholder="Frequency Name"
                required
                value={frequencyForm.frequency_name}
                onChange={e => setFrequencyForm({...frequencyForm, frequency_name: e.target.value})}
              />
              <textarea
                placeholder="Description"
                required
                value={frequencyForm.description}
                onChange={e => setFrequencyForm({...frequencyForm, description: e.target.value})}
              />
              <input
                type="text"
                placeholder="Benefits (comma-separated)"
                required
                value={frequencyForm.benefits}
                onChange={e => setFrequencyForm({...frequencyForm, benefits: e.target.value})}
              />
              <input
                type="text"
                placeholder="Chakra"
                value={frequencyForm.chakra}
                onChange={e => setFrequencyForm({...frequencyForm, chakra: e.target.value})}
              />
              <input
                type="text"
                placeholder="Color (hex code)"
                value={frequencyForm.color}
                onChange={e => setFrequencyForm({...frequencyForm, color: e.target.value})}
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingItem(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Update Frequency</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD AUDIO FILE MODAL */}
      {showAddModal && activeTab === 'audio' && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Upload Audio File</h2>
            <form onSubmit={handleAudioUpload}>
              <div className="file-upload-section">
                <label className="file-upload-label">
                  <span>📁 Choose Audio File (MP3 or WAV)</span>
                  <input
                    type="file"
                    accept="audio/mp3,audio/wav,audio/mpeg"
                    required
                    onChange={(e) => setAudioForm({...audioForm, file: e.target.files[0]})}
                    style={{ display: 'none' }}
                  />
                </label>
                {audioForm.file && (
                  <p className="file-selected">✓ {audioForm.file.name}</p>
                )}
              </div>

              <input
                type="number"
                placeholder="Frequency Min (Hz) - e.g., 174"
                required
                value={audioForm.frequency_min}
                onChange={e => setAudioForm({...audioForm, frequency_min: e.target.value})}
              />
              <input
                type="number"
                placeholder="Frequency Max (Hz) - e.g., 174"
                required
                value={audioForm.frequency_max}
                onChange={e => setAudioForm({...audioForm, frequency_max: e.target.value})}
              />
              <input
                type="text"
                placeholder="Primary Intentions (comma-separated) - e.g., stress, pain, sleep"
                required
                value={audioForm.primary_intentions}
                onChange={e => setAudioForm({...audioForm, primary_intentions: e.target.value})}
              />
              <input
                type="text"
                placeholder="Healing Properties (comma-separated) - e.g., Stress Relief, Pain/Tension"
                required
                value={audioForm.healing_properties}
                onChange={e => setAudioForm({...audioForm, healing_properties: e.target.value})}
              />
              <input
                type="text"
                placeholder="Harmonic Connections (comma-separated Hz) - e.g., 111, 222"
                value={audioForm.harmonic_connections}
                onChange={e => setAudioForm({...audioForm, harmonic_connections: e.target.value})}
              />
              <input
                type="text"
                placeholder="Frequency Family - e.g., Grounding"
                value={audioForm.frequency_family}
                onChange={e => setAudioForm({...audioForm, frequency_family: e.target.value})}
              />

              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)} disabled={uploadingFile}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={uploadingFile}>
                  {uploadingFile ? 'Uploading...' : 'Upload & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SERVICE MODAL */}
      {showAddModal && activeTab === 'services' && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Add New Service</h2>
            <form onSubmit={handleAddService}>
              <input
                type="text"
                placeholder="Service Name"
                required
                value={serviceForm.service_name}
                onChange={e => setServiceForm({...serviceForm, service_name: e.target.value})}
              />

              <input
                type="text"
                placeholder="Service Type (e.g., Vibro Acoustic Therapy, PEMF Therapy, Light Therapy)"
                required
                value={serviceForm.service_type}
                onChange={e => setServiceForm({...serviceForm, service_type: e.target.value})}
              />

              <textarea
                placeholder="Description"
                value={serviceForm.description}
                onChange={e => setServiceForm({...serviceForm, description: e.target.value})}
              />
              <input
                type="number"
                placeholder="Duration (minutes)"
                required
                value={serviceForm.duration_minutes}
                onChange={e => setServiceForm({...serviceForm, duration_minutes: e.target.value})}
              />
              <input
                type="number"
                placeholder="Price (in cents, e.g., 5000 = $50.00)"
                required
                value={serviceForm.price_cents}
                onChange={e => setServiceForm({...serviceForm, price_cents: e.target.value})}
              />
              <input
                type="text"
                placeholder="Icon Emoji (e.g., 🎵)"
                value={serviceForm.icon_emoji}
                onChange={e => setServiceForm({...serviceForm, icon_emoji: e.target.value})}
              />
              <input
                type="number"
                placeholder="Display Order (e.g., 1, 2, 3)"
                value={serviceForm.display_order}
                onChange={e => setServiceForm({...serviceForm, display_order: e.target.value})}
              />
              <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <input
                  type="checkbox"
                  checked={serviceForm.is_active}
                  onChange={e => setServiceForm({...serviceForm, is_active: e.target.checked})}
                />
                Active (show in booking form)
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Service</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SERVICE MODAL */}
      {editingItem && activeTab === 'services' && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Edit Service</h2>
            <form onSubmit={handleUpdateService}>
              <input
                type="text"
                placeholder="Service Name"
                required
                value={serviceForm.service_name}
                onChange={e => setServiceForm({...serviceForm, service_name: e.target.value})}
              />

              <input
                type="text"
                placeholder="Service Type (e.g., Vibro Acoustic Therapy, PEMF Therapy, Light Therapy)"
                required
                value={serviceForm.service_type}
                onChange={e => setServiceForm({...serviceForm, service_type: e.target.value})}
              />

              <textarea
                placeholder="Description"
                value={serviceForm.description}
                onChange={e => setServiceForm({...serviceForm, description: e.target.value})}
              />
              <input
                type="number"
                placeholder="Duration (minutes)"
                required
                value={serviceForm.duration_minutes}
                onChange={e => setServiceForm({...serviceForm, duration_minutes: e.target.value})}
              />
              <input
                type="number"
                placeholder="Price (in cents, e.g., 5000 = $50.00)"
                required
                value={serviceForm.price_cents}
                onChange={e => setServiceForm({...serviceForm, price_cents: e.target.value})}
              />
              <input
                type="text"
                placeholder="Icon Emoji (e.g., 🎵)"
                value={serviceForm.icon_emoji}
                onChange={e => setServiceForm({...serviceForm, icon_emoji: e.target.value})}
              />
              <input
                type="number"
                placeholder="Display Order (e.g., 1, 2, 3)"
                value={serviceForm.display_order}
                onChange={e => setServiceForm({...serviceForm, display_order: e.target.value})}
              />
              <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                <input
                  type="checkbox"
                  checked={serviceForm.is_active}
                  onChange={e => setServiceForm({...serviceForm, is_active: e.target.checked})}
                />
                Active (show in booking form)
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditingItem(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Update Service</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
