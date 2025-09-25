import React, { useState } from 'react';
import { addAviso } from '../avisosService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { X } from "lucide-react";

const AvisoForm = ({ profile, accessToken, onClose, onAvisoAdded }) => {
  const [titol, setTitol] = useState('');
  const [contingut, setContingut] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titol || !contingut) {
      setError('El títol i el contingut no poden estar buits.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = { Titol: titol, Contingut: contingut };
      await addAviso(payload, profile, accessToken);
      alert('Avís afegit correctament!');
      onAvisoAdded(); // This will refresh the list in the parent component
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="titol" className="text-right">Títol</label>
            <Input
              type="text"
              id="titol"
              value={titol}
              onChange={(e) => setTitol(e.target.value)}
              required
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="contingut" className="text-right">Contingut</label>
            <Textarea
              id="contingut"
              rows="10"
              value={contingut}
              onChange={(e) => setContingut(e.target.value)}
              required
              className="col-span-3"
            ></Textarea>
            <p className="text-sm text-gray-500 mt-1 font-bold col-span-3 col-start-2">
              Pots fer servir etiquetes HTML bàsiques com ara &lt;b&gt;negreta&lt;/b&gt;, &lt;i&gt;cursiva&lt;/i&gt;, i &lt;a href="..."&gt;enllaços&lt;/a&gt;.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel·lar</Button>
          <Button type="submit" variant="default" disabled={loading}>
            {loading ? 'Guardant...' : 'Guardar Avís'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AvisoForm;