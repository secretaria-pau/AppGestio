import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, PlusCircle, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

// --- Configuration --- (IMPORTANT: Move to .env file in a real app)
const API_KEY = 'AIzaSyD69lkn4BcjOaR3DFJZarcQcs8dgT4CYfU'; 
const SPREADSHEET_ID = '1wlvnGyvwsIReC_1bSkB2wo4UecJPNpOTs2ksB2n8Iqc';
const GEMINI_API_KEY = 'AIzaSyDHLqY0bxDKJPS7hmVY1zTmzlivK5f4OhQ'; // SECURITY RISK: Should be on a backend

// --- Helper Hooks & Functions ---
const useGapi = (accessToken) => {
    const [isGapiReady, setIsGapiReady] = useState(false);
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            window.gapi.load('client', async () => {
                try {
                    await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"] });
                    setIsGapiReady(true);
                } catch (error) { console.error("Error initializing GAPI client", error); }
            });
        };
        document.body.appendChild(script);
        return () => { document.body.removeChild(script); };
    }, []);

    useEffect(() => {
        if (isGapiReady && accessToken) {
            window.gapi.client.setToken({ access_token: accessToken });
        }
    }, [isGapiReady, accessToken]);

    return isGapiReady;
};

const formatDate = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);
    return date.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// --- Main Component ---
const SeguimentCSIView = ({ onBackClick, accessToken, profile }) => {
    const isGapiReady = useGapi(accessToken);
    const [currentTab, setCurrentTab] = useState('grups');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Data State
    const [grups, setGrups] = useState([]);
    const [alumnes, setAlumnes] = useState([]);
    const [matricules, setMatricules] = useState([]);
    const [anotacions, setAnotacions] = useState([]);

    // UI State
    const [selectedGrup, setSelectedGrup] = useState({ curs: '', ensenyament: '' });
    const [selectedAlumne, setSelectedAlumne] = useState('');
    const [selectedMatricula, setSelectedMatricula] = useState(null);
    const [matriculaForm, setMatriculaForm] = useState({ curs: '', ensenyament: '' });
    const [anotacionsFilters, setAnotacionsFilters] = useState({ curs: '', ensenyament: '', alumne: '' });
    const [anotacioForm, setAnotacioForm] = useState({ data: new Date().toISOString().split('T')[0], tipus: 'academic', anotacio: '' });
    const [diariState, setDiariState] = useState({ curs: '', ensenyament: '', data: new Date().toISOString().split('T')[0], rows: [], alumneToDuplicate: '' });
    const [geminiModal, setGeminiModal] = useState({ show: false, content: '' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const fetchData = useCallback(async (sheetName) => {
        try {
            const res = await window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: sheetName });
            const rows = res.result.values || [];
            if (rows.length < 1) return [];
            const headers = rows.shift();
            return rows.map(row => headers.reduce((obj, header, index) => ({ ...obj, [header]: row[index] || '' }), {}));
        } catch (err) {
            console.error(`Error fetching ${sheetName}:`, err);
            showToast(`Error carregant ${sheetName}: ${err.result?.error?.message || 'Error desconegut'}`, 'error');
            return [];
        }
    }, []);

    const postData = async (sheetName, data) => {
        setLoading(true);
        try {
            const dataArray = Array.isArray(data) ? data : [data];
            if (dataArray.length === 0) return { success: true };
            const headerResponse = await window.gapi.client.sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!1:1` });
            const headers = headerResponse.result.values[0];
            const valuesToAppend = dataArray.map(obj => headers.map(header => obj[header] || ""));
            await window.gapi.client.sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!A1`, valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS', resource: { values: valuesToAppend } });
            return { success: true };
        } catch (err) {
            console.error(`Error posting to ${sheetName}:`, err);
            showToast(`Error desant dades: ${err.result?.error?.message || 'Error desconegut'}`, 'error');
            return { success: false };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only initialize the app if we have an access token, GAPI is ready, and we have a profile
        if (isGapiReady && accessToken && profile) {
            const initializeApp = async () => {
                setLoading(true);
                const [g, a, m, an] = await Promise.all([fetchData('Grups'), fetchData('Alumnes'), fetchData('Matrícules'), fetchData('Anotacions')]);
                setGrups(g);
                setAlumnes(a);
                setMatricules(m);
                setAnotacions(an);
                setLoading(false);
            };
            initializeApp();
        }
    }, [isGapiReady, accessToken, profile, fetchData]);

    // --- Event Handlers ---
    const handleAddGrup = async (e) => {
        e.preventDefault();
        const newGrup = { 'Curs Acadèmic': e.target.elements.curs.value, 'Ensenyament': e.target.elements.ensenyament.value };
        if (await postData('Grups', newGrup)) {
            setGrups(prev => [...prev, newGrup]);
            showToast('Grup afegit correctament!');
            e.target.reset();
        }
    };

    const handleAddAlumne = async (e) => {
        e.preventDefault();
        const newAlumne = { 'Nom': e.target.elements.nom.value };
        if (await postData('Alumnes', newAlumne)) {
            setAlumnes(prev => [...prev, newAlumne]);
            showToast('Alumne afegit correctament!');
            e.target.reset();
        }
    };

    const handleAddMatricula = async (e) => {
        e.preventDefault();
        if (!selectedAlumne) { showToast("Tria un alumne primer", "error"); return; }
        if (!matriculaForm.curs || !matriculaForm.ensenyament) { showToast("Tria un curs i ensenyament", "error"); return; }
        const newMatricula = { 'Curs': matriculaForm.curs, 'Ensenyament': matriculaForm.ensenyament, 'Alumne': selectedAlumne };
        if (await postData('Matrícules', newMatricula)) {
            setMatricules(prev => [...prev, newMatricula]);
            showToast('Alumne matriculat correctament!');
            setMatriculaForm({ curs: '', ensenyament: '' });
        }
    };

    const handleAddAnotacio = async (e) => {
        e.preventDefault();
        const { curs, ensenyament, alumne } = anotacionsFilters;
        if (!curs || !ensenyament || !alumne) { showToast("Cal seleccionar curs, ensenyament i alumne als filtres.", "error"); return; }
        const newAnotacio = { 'Ensenyament': ensenyament, 'Alumne': alumne, 'Data': anotacioForm.data, 'Tipus': anotacioForm.tipus, 'Anotació': anotacioForm.anotacio };
        if (await postData('Anotacions', newAnotacio)) {
            setAnotacions(prev => [...prev, newAnotacio]);
            showToast("Anotació afegida correctament!");
            setAnotacioForm(prev => ({ ...prev, anotacio: '' }));
        }
    };

    const handleAddAnotacioFromAlumneTab = async (e) => {
        e.preventDefault();
        if (!selectedMatricula) { return; }
        const newAnotacio = { ...selectedMatricula, 'Data': e.target.elements.data.value, 'Tipus': e.target.elements.tipus.value, 'Anotació': e.target.elements.anotacio.value };
        if (await postData('Anotacions', newAnotacio)) {
            setAnotacions(prev => [...prev, newAnotacio]);
            showToast("Anotació afegida correctament!");
            e.target.reset();
        }
    };

    const handleGuardarDiari = async () => {
        const { curs, ensenyament, data } = diariState;
        if (!curs || !ensenyament || !data) { showToast("Selecciona curs, ensenyament i data", 'error'); return; }
        const novesAnotacions = diariState.rows.filter(row => row.anotacio.trim() !== '').map(row => ({ 'Ensenyament': ensenyament, 'Alumne': row.alumne, 'Data': data, 'Tipus': row.tipus, 'Anotació': row.anotacio.trim() }));
        if (novesAnotacions.length === 0) { showToast("No hi ha cap anotació per guardar.", 'error'); return; }
        if (await postData('Anotacions', novesAnotacions)) {
            setAnotacions(prev => [...prev, ...novesAnotacions]);
            showToast(`${novesAnotacions.length} anotacions guardades!`);
            setDiariState(prev => ({ ...prev, rows: prev.rows.map(r => ({ ...r, anotacio: '' })) }));
        }
    };

    const handleDuplicarFila = () => {
        if (!diariState.alumneToDuplicate) { showToast("Selecciona un alumne per duplicar", "error"); return; }
        setDiariState(prev => ({ ...prev, rows: [...prev.rows, { alumne: prev.alumneToDuplicate, tipus: 'academic', anotacio: '' }] }));
    };

    const handleGeminiClick = async () => {
        const { alumne } = anotacionsFilters;
        if (!alumne) { showToast("Selecciona un alumne per generar el resum.", "error"); return; }
        const anotacionsPerResum = filteredAnotacions.filter(a => a.Alumne === alumne);
        if (anotacionsPerResum.length === 0) { showToast("No hi ha anotacions per a generar el resum.", "error"); return; }
        setLoading(true);
        try {
            const prompt = `Ets un tutor expert. Basant-te en les següents anotacions sobre l'alumne ${alumne}, fes un resum concís de la seva evolució en format de punts clau i, a continuació, proposa un suggeriment clar i accionable per a la seva millora. Estructura la resposta amb un títol "Resum d'Evolució" i un altre "Suggeriment". Anotacions:\n${anotacionsPerResum.map(a => `${a.Data} (${a.Tipus}): ${a.Anotació}`).join('\n')}`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
            if (!response.ok) throw new Error(await response.text());
            const result = await response.json();
            const text = result.candidates[0].content.parts[0].text;
            setGeminiModal({ show: true, content: text });
        } catch (error) {
            console.error("Error amb l'API de Gemini:", error);
            showToast("No s'ha pogut generar el resum.", "error");
        } finally {
            setLoading(false);
        }
    };

    // --- Memoized Filtered Data ---
    const filteredAnotacions = useMemo(() => {
        return anotacions
            .filter(a => 
                (!anotacionsFilters.curs || matricules.some(m => m.Alumne === a.Alumne && m.Curs === anotacionsFilters.curs)) &&
                (!anotacionsFilters.ensenyament || a.Ensenyament === anotacionsFilters.ensenyament) &&
                (!anotacionsFilters.alumne || a.Alumne === anotacionsFilters.alumne)
            )
            .sort((a, b) => new Date(b.Data) - new Date(a.Data));
    }, [anotacions, matricules, anotacionsFilters]);

    useEffect(() => {
        const { curs, ensenyament } = diariState;
        if (curs && ensenyament) {
            const alumnesMatriculats = matricules.filter(m => m.Curs === curs && m.Ensenyament === ensenyament).map(m => m.Alumne);
            setDiariState(prev => ({ ...prev, rows: alumnesMatriculats.sort().map(alumne => ({ alumne, tipus: 'academic', anotacio: '' })), alumneToDuplicate: alumnesMatriculats[0] || '' }));
        } else {
            setDiariState(prev => ({ ...prev, rows: [], alumneToDuplicate: '' }));
        }
    }, [diariState.curs, diariState.ensenyament, matricules]);

    if (!isGapiReady) return <div className="text-center p-8">Carregant API de Google...</div>;

    const Badge = ({ type }) => <span className={`badge tipo-${type?.toLowerCase() || 'default'}`}>{type}</span>;

    return (
        <>
        <style>{`.badge{padding:.25rem .75rem;border-radius:9999px;font-size:.75rem;font-weight:600;white-space:nowrap}.tipo-academic{background-color:#dbeafe;color:#1e40af}.tipo-social{background-color:#ede9fe;color:#5b21b6}.tipo-absentisme{background-color:#fef3c7;color:#b45309}.tipo-baixa{background-color:#fee2e2;color:#991b1b}.tipo-derivacio{background-color:#dcfce7;color:#166534}.tipo-tutoria{background-color:#cffafe;color:#0891b2}.tipo-default{background-color:#e5e7eb;color:#4b5563}`}</style>
        <div className="min-h-screen bg-gray-100">
            {loading && <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"><p className="text-white text-xl">Processant...</p></div>}
            {toast.show && <div className={`fixed bottom-5 right-5 text-white py-3 px-6 rounded-lg shadow-xl z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}><p>{toast.message}</p></div>}
            <Dialog open={geminiModal.show} onOpenChange={() => setGeminiModal({ show: false, content: '' })}><DialogContent><DialogHeader><DialogTitle>Resum de la IA</DialogTitle><DialogDescription asChild><div className="prose" dangerouslySetInnerHTML={{ __html: geminiModal.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/^\* (.*$)/gm, '<ul><li>$1</li></ul>').replace(/<\/ul>\n<ul>/g, '') }} /></DialogDescription></DialogHeader></DialogContent></Dialog>

            <header className="bg-white shadow-sm sticky top-0 z-40"><div className="container mx-auto p-4 flex justify-between items-center"><Button onClick={onBackClick}><ArrowLeft className="h-4 w-4 mr-2" />Tornar</Button><h1 className="text-2xl font-bold">Seguiment d'Alumnes</h1><div className="text-right">                        <div className="font-semibold">{profile?.name} ({profile?.role})</div><div className="text-xs text-muted-foreground">{profile?.email}</div></div></div></header>

            <main className="container mx-auto p-4">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <nav className="flex flex-wrap justify-center gap-2 mb-6">
                        <Button onClick={() => setCurrentTab('grups')} variant={currentTab === 'grups' ? 'default' : 'outline'}>Grups</Button>
                        <Button onClick={() => setCurrentTab('alumnes')} variant={currentTab === 'alumnes' ? 'default' : 'outline'}>Alumnes</Button>
                        <Button onClick={() => setCurrentTab('anotacions')} variant={currentTab === 'anotacions' ? 'default' : 'outline'}>Anotacions</Button>
                        <Button onClick={() => setCurrentTab('diari')} variant={currentTab === 'diari' ? 'default' : 'outline'}>Diari de Classe</Button>
                    </nav>

                    {currentTab === 'grups' && <TabGrups {...{ grups, matricules, anotacions, selectedGrup, setSelectedGrup, handleAddGrup, Badge }} />}
                    {currentTab === 'alumnes' && <TabAlumnes {...{ alumnes, grups, matricules, anotacions, selectedAlumne, setSelectedAlumne, selectedMatricula, setSelectedMatricula, matriculaForm, setMatriculaForm, handleAddAlumne, handleAddMatricula, handleAddAnotacioFromAlumneTab, Badge }} />}
                    {currentTab === 'anotacions' && <TabAnotacions {...{ anotacions: filteredAnotacions, filters: anotacionsFilters, setFilters: setAnotacionsFilters, grups, matricules, Badge, anotacioForm, setAnotacioForm, handleAddAnotacio, handleGeminiClick }} />}
                    {currentTab === 'diari' && <TabDiari {...{ diariState, setDiariState, grups, handleGuardarDiari, handleDuplicarFila }} />}
                </div>
            </main>
        </div>
        </>
    );
};

// --- Sub-components for each tab ---
const TabGrups = ({ grups, matricules, anotacions, selectedGrup, setSelectedGrup, handleAddGrup, Badge }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h2 className="text-xl font-bold mb-4">Selecció de Grup</h2>
                <div className="space-y-4">
                    <Select onValueChange={c => setSelectedGrup({ curs: c, ensenyament: '' })} value={selectedGrup.curs}><SelectTrigger><SelectValue placeholder="1. Tria un Curs" /></SelectTrigger><SelectContent>{[...new Set(grups.map(g => g['Curs Acadèmic']))].sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                    <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-gray-50 border rounded-md">
                        {selectedGrup.curs ? grups.filter(g => g['Curs Acadèmic'] === selectedGrup.curs).map(g => g.Ensenyament).sort().map(e => <div key={e} className={`p-3 rounded-lg cursor-pointer ${selectedGrup.ensenyament === e ? 'bg-purple-600 text-white' : 'bg-white hover:bg-purple-100'}`} onClick={() => setSelectedGrup(prev => ({ ...prev, ensenyament: e }))}>{e}</div>) : <p className="text-sm text-gray-500">Tria un curs per veure els ensenyaments.</p>}
                    </div>
                </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50 self-start">
                <h3 className="text-lg font-semibold mb-3">Afegir Nou Grup</h3>
                <form onSubmit={handleAddGrup} className="space-y-3"><Input name="curs" placeholder="Curs Acadèmic" required /><Input name="ensenyament" placeholder="Ensenyament" required /><Button type="submit" className="w-full">Afegir Grup</Button></form>
            </div>
        </div>
        {selectedGrup.ensenyament && (
            <div className="mt-6 pt-6 border-t">
                <h2 className="text-xl font-bold mb-4">Detalls del Grup: <span className="text-purple-700">{selectedGrup.curs} / {selectedGrup.ensenyament}</span></h2>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-1"> <h3 className="text-lg font-semibold mb-2">Alumnes Matriculats</h3> <div className="overflow-x-auto max-h-96 border rounded-lg"><table className="min-w-full text-sm"><tbody>{matricules.filter(m => m.Curs === selectedGrup.curs && m.Ensenyament === selectedGrup.ensenyament).map(m => m.Alumne).sort().map(alumne => <tr key={alumne}><td className="p-2 border-b">{alumne}</td></tr>)}</tbody></table></div></div>
                    <div className="xl:col-span-2"> <h3 className="text-lg font-semibold mb-2">Anotacions del Grup</h3> <div className="overflow-auto max-h-96 border rounded-lg"><table className="min-w-full text-sm"><thead><tr className="bg-gray-50"><th className="p-2 border-b text-left">Alumne</th><th className="p-2 border-b text-left">Data</th><th className="p-2 border-b text-left">Tipus</th><th className="p-2 border-b text-left">Anotació</th></tr></thead><tbody>{anotacions.filter(a => a.Ensenyament === selectedGrup.ensenyament && matricules.some(m => m.Alumne === a.Alumne && m.Curs === selectedGrup.curs)).sort((a,b) => new Date(b.Data) - new Date(a.Data)).map((a, i) => <tr key={i}><td className="p-2 border-b">{a.Alumne}</td><td className="p-2 border-b">{formatDate(a.Data)}</td><td className="p-2 border-b"><Badge type={a.Tipus} /></td><td className="p-2 border-b">{a.Anotació}</td></tr>)}</tbody></table></div></div>
                </div>
            </div>
        )}
    </div>
);

const TabAlumnes = ({ alumnes, grups, matricules, anotacions, selectedAlumne, setSelectedAlumne, selectedMatricula, setSelectedMatricula, matriculaForm, setMatriculaForm, handleAddAlumne, handleAddMatricula, handleAddAnotacioFromAlumneTab, Badge }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h2 className="text-xl font-bold mb-4">Selecció i Matrícula</h2>
                <div className="space-y-4">
                    <Select onValueChange={v => {setSelectedAlumne(v); setSelectedMatricula(null);}} value={selectedAlumne}><SelectTrigger><SelectValue placeholder="1. Tria un Alumne" /></SelectTrigger><SelectContent>{alumnes.sort((a,b) => a.Nom.localeCompare(b.Nom)).map(a => <SelectItem key={a.Nom} value={a.Nom}>{a.Nom}</SelectItem>)}</SelectContent></Select>
                    <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-gray-50 border rounded-md">
                        {selectedAlumne ? matricules.filter(m => m.Alumne === selectedAlumne).sort((a,b) => b.Curs.localeCompare(a.Curs)).map(m => <div key={`${m.Curs}-${m.Ensenyament}`} className={`p-3 rounded-lg cursor-pointer ${selectedMatricula?.Curs === m.Curs && selectedMatricula?.Ensenyament === m.Ensenyament ? 'bg-purple-600 text-white' : 'bg-white hover:bg-purple-100'}`} onClick={() => setSelectedMatricula(m)}>{`${m.Curs} / ${m.Ensenyament}`}</div>) : <p className="text-sm text-gray-500">Tria un alumne per veure les seves matrícules.</p>}
                    </div>
                </div>
            </div>
            <div className="p-4 border rounded-lg bg-gray-50 self-start">
                <h3 className="text-lg font-semibold mb-3">Nova Matrícula</h3>
                <form onSubmit={handleAddMatricula} className="space-y-3">
                    <Input value={selectedAlumne || "Alumne no seleccionat"} disabled />
                    <Select onValueChange={c => setMatriculaForm({ curs: c, ensenyament: '' })} value={matriculaForm.curs}><SelectTrigger><SelectValue placeholder="2. Tria un Curs" /></SelectTrigger><SelectContent>{[...new Set(grups.map(g => g['Curs Acadèmic']))].sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                    <Select onValueChange={e => setMatriculaForm(f => ({ ...f, ensenyament: e }))} value={matriculaForm.ensenyament} disabled={!matriculaForm.curs}><SelectTrigger><SelectValue placeholder="3. Tria un Ensenyament" /></SelectTrigger><SelectContent>{matriculaForm.curs && grups.filter(g => g['Curs Acadèmic'] === matriculaForm.curs).map(g => g.Ensenyament).sort().map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
                    <Button type="submit" className="w-full" disabled={!selectedAlumne}>Matricular Alumne</Button>
                </form>
            </div>
        </div>
        {selectedMatricula && (
            <div className="mt-6 pt-6 border-t space-y-6">
                <h2 className="text-xl font-bold">Anotacions de: <span className="text-purple-700">{selectedMatricula.Alumne} a {selectedMatricula.Ensenyament}</span></h2>
                <div className="overflow-auto max-h-96 border rounded-lg"><table className="min-w-full text-sm"><thead><tr className="bg-gray-50"><th className="p-2 border-b text-left">Data</th><th className="p-2 border-b text-left">Tipus</th><th className="p-2 border-b text-left">Anotació</th></tr></thead><tbody>{anotacions.filter(a => a.Alumne === selectedMatricula.Alumne && a.Ensenyament === selectedMatricula.Ensenyament).sort((a,b) => new Date(b.Data) - new Date(a.Data)).map((a,i) => <tr key={i}><td className="p-2 border-b">{formatDate(a.Data)}</td><td className="p-2 border-b"><Badge type={a.Tipus} /></td><td className="p-2 border-b">{a.Anotació}</td></tr>)}</tbody></table></div>
                <div className="p-4 border rounded-lg bg-gray-50">
                    <h3 className="text-lg font-semibold mb-3">Nova Anotació per a {selectedMatricula.Alumne}</h3>
                    <form onSubmit={handleAddAnotacioFromAlumneTab} className="space-y-3"><Input type="date" name="data" defaultValue={new Date().toISOString().split('T')[0]} required /><Select name="tipus" defaultValue="academic"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="academic">Acadèmic</SelectItem><SelectItem value="social">Social</SelectItem><SelectItem value="absentisme">Absentisme</SelectItem><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="derivacio">Derivació</SelectItem><SelectItem value="tutoria">Tutoria</SelectItem></SelectContent></Select><Textarea name="anotacio" placeholder="Anotació..." required /><Button type="submit" className="w-full">Afegir Anotació</Button></form>
                </div>
            </div>
        )}
    </div>
);

const TabAnotacions = ({ anotacions, filters, setFilters, grups, matricules, Badge, anotacioForm, setAnotacioForm, handleAddAnotacio, handleGeminiClick }) => (
    <div className="space-y-6">
        <h2 className="text-xl font-bold mb-4">Cercador d'Anotacions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
            <Select onValueChange={c => setFilters({ curs: c, ensenyament: '', alumne: '' })} value={filters.curs}><SelectTrigger><SelectValue placeholder="Filtrar per Curs..." /></SelectTrigger><SelectContent>{[...new Set(grups.map(g => g['Curs Acadèmic']))].sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            <Select onValueChange={e => setFilters(f => ({ ...f, ensenyament: e, alumne: '' }))} value={filters.ensenyament} disabled={!filters.curs}><SelectTrigger><SelectValue placeholder="Filtrar per Ensenyament..." /></SelectTrigger><SelectContent>{filters.curs && grups.filter(g => g['Curs Acadèmic'] === filters.curs).map(g => g.Ensenyament).sort().map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
            <Select onValueChange={a => setFilters(f => ({ ...f, alumne: a }))} value={filters.alumne} disabled={!filters.ensenyament}><SelectTrigger><SelectValue placeholder="Filtrar per Alumne..." /></SelectTrigger><SelectContent>{filters.ensenyament && matricules.filter(m => m.Curs === filters.curs && m.Ensenyament === filters.ensenyament).map(m => m.Alumne).sort().map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="flex justify-end mb-6"><Button onClick={handleGeminiClick} disabled={!filters.alumne}><Sparkles className="h-4 w-4 mr-2" />Generar Comentari amb IA</Button></div>
        <div className="overflow-auto max-h-[50vh]"><table className="min-w-full text-sm"><thead><tr className="bg-gray-50"><th className="p-2 border-b text-left">Alumne</th><th className="p-2 border-b text-left">Data</th><th className="p-2 border-b text-left">Tipus</th><th className="p-2 border-b text-left">Anotació</th><th className="p-2 border-b text-left">Grup</th></tr></thead><tbody>{anotacions.map((a, i) => <tr key={i}><td className="p-2 border-b">{a.Alumne}</td><td className="p-2 border-b">{formatDate(a.Data)}</td><td className="p-2 border-b"><Badge type={a.Tipus} /></td><td className="p-2 border-b">{a.Anotació}</td><td className="p-2 border-b">{a.Ensenyament}</td></tr>)}</tbody></table></div>
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-lg font-semibold mb-3">Nova Anotació</h3>
            <form onSubmit={handleAddAnotacio} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label>Grup</label><Input value={filters.ensenyament ? `${filters.curs} / ${filters.ensenyament}` : ""} disabled /></div>
                    <div><label>Alumne</label><Input value={filters.alumne} disabled /></div>
                    <div><label>Data</label><Input type="date" value={anotacioForm.data} onChange={e => setAnotacioForm(f => ({...f, data: e.target.value}))} required /></div>
                    <div><label>Tipus</label><Select value={anotacioForm.tipus} onValueChange={t => setAnotacioForm(f => ({...f, tipus: t}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="academic">Acadèmic</SelectItem><SelectItem value="social">Social</SelectItem><SelectItem value="absentisme">Absentisme</SelectItem><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="derivacio">Derivació</SelectItem><SelectItem value="tutoria">Tutoria</SelectItem></SelectContent></Select></div>
                    <div className="md:col-span-2"><label>Anotació</label><Textarea value={anotacioForm.anotacio} onChange={e => setAnotacioForm(f => ({...f, anotacio: e.target.value}))} required /></div>
                </div>
                <Button type="submit" className="w-full mt-4" disabled={!filters.alumne}>Afegir Anotació</Button>
            </form>
        </div>
    </div>
);

const TabDiari = ({ diariState, setDiariState, grups, handleGuardarDiari, handleDuplicarFila }) => (
    <div className="space-y-6">
        <h2 className="text-xl font-bold mb-4">Diari de Classe</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
            <Select onValueChange={c => setDiariState(s => ({ ...s, curs: c, ensenyament: '' }))} value={diariState.curs}><SelectTrigger><SelectValue placeholder="1. Tria Curs" /></SelectTrigger><SelectContent>{[...new Set(grups.map(g => g['Curs Acadèmic']))].sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            <Select onValueChange={e => setDiariState(s => ({ ...s, ensenyament: e }))} value={diariState.ensenyament} disabled={!diariState.curs}><SelectTrigger><SelectValue placeholder="2. Tria Ensenyament" /></SelectTrigger><SelectContent>{diariState.curs && grups.filter(g => g['Curs Acadèmic'] === diariState.curs).map(g => g.Ensenyament).sort().map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
            <Input type="date" value={diariState.data} onChange={e => setDiariState(s => ({ ...s, data: e.target.value }))} />
        </div>
        <div className="flex items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg border">
            <label className="font-semibold">Duplicar fila per a:</label>
            <Select onValueChange={val => setDiariState(s => ({...s, alumneToDuplicate: val}))} value={diariState.alumneToDuplicate}><SelectTrigger className="flex-grow"><SelectValue placeholder="Selecciona un alumne" /></SelectTrigger><SelectContent>{[...new Set(diariState.rows.map(r => r.alumne))].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select>
            <Button onClick={handleDuplicarFila} variant="outline"><PlusCircle className="h-4 w-4 mr-2" />Duplicar</Button>
        </div>
        <div className="overflow-auto max-h-[50vh] mb-6"><table className="min-w-full text-sm"><thead><tr className="bg-gray-50"><th className="p-2 border-b">Alumne</th><th className="p-2 border-b">Tipus</th><th className="p-2 border-b">Anotació</th></tr></thead><tbody>{diariState.rows.map((row, index) => <tr key={`${row.alumne}-${index}`}><td className="p-2 border-b align-top">{row.alumne}</td><td className="p-2 border-b"><Select value={row.tipus} onValueChange={v => setDiariState(s => ({ ...s, rows: s.rows.map((r, i) => i === index ? { ...r, tipus: v } : r) }))}><SelectTrigger /><SelectContent><SelectItem value="academic">Acadèmic</SelectItem><SelectItem value="social">Social</SelectItem><SelectItem value="absentisme">Absentisme</SelectItem><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="derivacio">Derivació</SelectItem><SelectItem value="tutoria">Tutoria</SelectItem></SelectContent></Select></td><td className="p-2 border-b"><Textarea value={row.anotacio} onChange={e => setDiariState(s => ({ ...s, rows: s.rows.map((r, i) => i === index ? { ...r, anotacio: e.target.value } : r) }))} /></td></tr>)}</tbody></table></div>
        <Button onClick={handleGuardarDiari} disabled={diariState.rows.length === 0}>Guardar Diari</Button>
    </div>
);

export default SeguimentCSIView;