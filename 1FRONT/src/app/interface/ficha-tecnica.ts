export interface OrdenIngreso {
    name: string
    clientId?:number
    rut: string
    address: string
    city: string
    phone: string
    code?: number | string
    date?: Date;
    email?: string
    description: string
    observation: string
    qr?:string
    status?: string
    company_name?: string
}