export type User = {
    id?: number;
    first_name: string;
    last_name: string;
    email: string;
    image?: string;
};

export type UserContextType = {
    user: User | null;
    login: (first_name: string, last_name: string, email: string, image?: string, id?:number) => void; // <--- hier image optional hinzufügen
    logout: () => void;
};