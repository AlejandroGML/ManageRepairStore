export const OrderExample = {
  order:{
  description: 'Ejemplo de orden',
  value: {
    name: 'Nombre del cliente',
    rut: '11111111-1',
    address: 'Dirección del cliente',
    city: 'Ciudad del cliente',
    phone: '123456789',
    email:'test@demo.example',
    description: 'Descripción de la orden',
    observation: 'Observación de la orden',
    status: 'Pendiente',
    comment: 'Sin comentarios'
  },
}};

export const OrderStatusExample = {
  user:{
  description: 'Ejemplo Actualizar Estado Orden',
  value: {
    id: 70,
    status: 'Finalizado',
    comment: 'Listo',
  },
}};

export const ClientExample = {
  user:{
  description: 'Ejemplo de usuario',
  value: {
    name: 'Nombre del cliente',
    rut: '11111111-1',
    address: 'Dirección del cliente',
    city: 'Ciudad del cliente',
    phone: '123456789',
    email:'test@demo.example',
  },
}};

export const LogExample = {
  log:{
  description: 'Ejemplo de log',
  value: {
    userName:'Oficina',
    clientId:'2',
    clientName:'Cliente Demo',
    action:'eliminar',
  }, 
 }};

 export const ProductExample = {
  product:{
  description: 'Ejemplo de producto',
  value: {
    name: 'Tornillos 20mm',
    transaction: {
      operation:'entrada',
      quantity:'20',
      costPrice: '500',
      sellingPrice: '1000',
      maxDiscount: '300',
      location: 'Bodega Central Demo',
      finalStock:'17',
      purchaseDiscount: '100',
      finalValue: '900',
      payMethod: 'transferencia',
      operator: 'Vendedor',
      manager: 'Administrador',
      assignedWorker: 'Técnico Demo',
      description: 'Ingreso de mercadería',
    }
  },
}};

export const TransactionExample = {
  transaction:{
  description: 'Ejemplo de Transacción',
  value: {
    name: 'Pernos 40mm',
    activeProduct: 'true',
    operation: 'salida',
    quantity: '20',
    costPrice: '500',
    sellingPrice: '1000',
    maxDiscount: '300',
    location: 'Bodega Central Demo',
    finalStock: '17',
    purchaseDiscount: '0',
    finalValue: '17000',
    payMethod: 'transferencia',
    operator: 'Administrador',
    manager: 'Administrador',
    assignedWorker: '',
    description: '',
    deleted: 'false',
  }, 
}};
