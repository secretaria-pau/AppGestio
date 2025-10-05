import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "./ui";

const LoginView = ({ onLogin, error }) => {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Card className="w-[350px] shadow-sm rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">App Gestió CFA LA PAU</CardTitle>
          <CardDescription className="text-gray-600">Si us plau, inicieu sessió con Google</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Button onClick={onLogin} className="w-full bg-primary hover:bg-primary-light text-white font-bold py-2 px-4 rounded">
            Accedir con Google
          </Button>
          {error && <p className="text-red-500 mt-3">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginView;