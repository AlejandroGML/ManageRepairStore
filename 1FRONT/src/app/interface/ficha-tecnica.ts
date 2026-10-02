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
    status?:string
    /** Nombre de la empresa (display; el backend lo usa para crearla). */
    company_name?: string
    /** Empresa elegida explícitamente (spec companies). */
    companyId?: number | null
    /** Marca "Es empresa" (creación explícita). */
    is_company?: boolean
}