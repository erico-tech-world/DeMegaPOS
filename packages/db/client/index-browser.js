
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('@prisma/client/runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 6.2.1
 * Query Engine version: 4123509d24aa4dede1e864b46351bf2790323b69
 */
Prisma.prismaVersion = {
  client: "6.2.1",
  engine: "4123509d24aa4dede1e864b46351bf2790323b69"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  domain: 'domain',
  businessCode: 'businessCode',
  universalPasswordHash: 'universalPasswordHash',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  settings: 'settings'
};

exports.Prisma.StoreScalarFieldEnum = {
  id: 'id',
  name: 'name',
  location: 'location',
  phone: 'phone',
  branchCode: 'branchCode',
  status: 'status',
  isActive: 'isActive',
  branchSettings: 'branchSettings',
  tenantId: 'tenantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  phone: 'phone',
  password: 'password',
  name: 'name',
  role: 'role',
  staffCode: 'staffCode',
  pin: 'pin',
  status: 'status',
  isActive: 'isActive',
  onboardedAt: 'onboardedAt',
  terminationReason: 'terminationReason',
  terminatedAt: 'terminatedAt',
  permissions: 'permissions',
  tenantId: 'tenantId',
  branchId: 'branchId',
  mfaEnabled: 'mfaEnabled',
  mfaSecret: 'mfaSecret',
  themePreference: 'themePreference'
};

exports.Prisma.PlatformKeyScalarFieldEnum = {
  id: 'id',
  label: 'label',
  secretKey: 'secretKey',
  isSingleUse: 'isSingleUse',
  isUsed: 'isUsed',
  createdBy: 'createdBy',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.UserSessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  deviceFingerprint: 'deviceFingerprint',
  userAgent: 'userAgent',
  ipAddress: 'ipAddress',
  lastActive: 'lastActive',
  isMfaVerified: 'isMfaVerified',
  createdAt: 'createdAt'
};

exports.Prisma.TerminalIntegrationScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  provider: 'provider',
  label: 'label',
  apiKey: 'apiKey',
  secretKey: 'secretKey',
  contractCode: 'contractCode',
  baseUrl: 'baseUrl',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TerminalTransactionScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  integrationId: 'integrationId',
  transactionRef: 'transactionRef',
  paymentRef: 'paymentRef',
  amount: 'amount',
  settledAt: 'settledAt',
  rawResponse: 'rawResponse',
  createdAt: 'createdAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  name: 'name',
  sku: 'sku',
  barcode: 'barcode',
  price: 'price',
  costPrice: 'costPrice',
  vipPrice: 'vipPrice',
  unit: 'unit',
  stock: 'stock',
  minStock: 'minStock',
  type: 'type',
  expiryDate: 'expiryDate',
  batchNumber: 'batchNumber',
  isBundle: 'isBundle',
  imageUrl: 'imageUrl',
  tenantId: 'tenantId',
  categoryId: 'categoryId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ProductVariantScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  name: 'name',
  sku: 'sku',
  price: 'price',
  costPrice: 'costPrice',
  vipPrice: 'vipPrice',
  unit: 'unit',
  stock: 'stock',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BundleItemScalarFieldEnum = {
  id: 'id',
  bundleProductId: 'bundleProductId',
  componentProductId: 'componentProductId',
  quantity: 'quantity'
};

exports.Prisma.StockAdjustmentScalarFieldEnum = {
  id: 'id',
  type: 'type',
  quantity: 'quantity',
  reason: 'reason',
  productId: 'productId',
  variantId: 'variantId',
  userId: 'userId',
  tenantId: 'tenantId',
  createdAt: 'createdAt'
};

exports.Prisma.CategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  tenantId: 'tenantId'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  walletBalance: 'walletBalance',
  tenantId: 'tenantId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OrderScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  cashierId: 'cashierId',
  customerId: 'customerId',
  totalAmount: 'totalAmount',
  paymentMethod: 'paymentMethod',
  status: 'status',
  paymentStatus: 'paymentStatus',
  fulfillmentStatus: 'fulfillmentStatus',
  posDeviceType: 'posDeviceType',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RefundScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  amount: 'amount',
  reason: 'reason',
  processedBy: 'processedBy',
  createdAt: 'createdAt'
};

exports.Prisma.CreditSaleScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  customerId: 'customerId',
  dueDate: 'dueDate',
  isPaid: 'isPaid',
  balance: 'balance',
  createdAt: 'createdAt'
};

exports.Prisma.SplitPaymentScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  method: 'method',
  amount: 'amount',
  reference: 'reference',
  createdAt: 'createdAt'
};

exports.Prisma.ActivityLogScalarFieldEnum = {
  id: 'id',
  action: 'action',
  entity: 'entity',
  entityId: 'entityId',
  details: 'details',
  userId: 'userId',
  tenantId: 'tenantId',
  createdAt: 'createdAt'
};

exports.Prisma.StaffInvitationScalarFieldEnum = {
  id: 'id',
  email: 'email',
  phone: 'phone',
  role: 'role',
  branchId: 'branchId',
  token: 'token',
  tenantId: 'tenantId',
  expiresAt: 'expiresAt',
  acceptedAt: 'acceptedAt',
  createdAt: 'createdAt'
};

exports.Prisma.OrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  productId: 'productId',
  variantId: 'variantId',
  quantity: 'quantity',
  price: 'price',
  seatNumber: 'seatNumber'
};

exports.Prisma.IntegrationAppScalarFieldEnum = {
  id: 'id',
  name: 'name',
  clientId: 'clientId',
  clientSecret: 'clientSecret',
  scopes: 'scopes',
  webhookUrl: 'webhookUrl',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.Role = exports.$Enums.Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  BRANCH_MANAGER: 'BRANCH_MANAGER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  CASHIER: 'CASHIER'
};

exports.ProductType = exports.$Enums.ProductType = {
  STANDARD: 'STANDARD',
  VARIANT: 'VARIANT',
  BUNDLED: 'BUNDLED'
};

exports.StockAdjustmentType = exports.$Enums.StockAdjustmentType = {
  IN: 'IN',
  OUT: 'OUT',
  ADJUST: 'ADJUST',
  RETURN: 'RETURN'
};

exports.PaymentMethod = exports.$Enums.PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  TRANSFER: 'TRANSFER',
  WALLET: 'WALLET',
  SPLIT: 'SPLIT',
  CREDIT: 'CREDIT'
};

exports.FulfillmentStatus = exports.$Enums.FulfillmentStatus = {
  NEW: 'NEW',
  PENDING: 'PENDING',
  IN_PREPARATION: 'IN_PREPARATION',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  DELIVERED: 'DELIVERED',
  SHIPPED: 'SHIPPED'
};

exports.Prisma.ModelName = {
  Tenant: 'Tenant',
  Store: 'Store',
  User: 'User',
  PlatformKey: 'PlatformKey',
  UserSession: 'UserSession',
  TerminalIntegration: 'TerminalIntegration',
  TerminalTransaction: 'TerminalTransaction',
  Product: 'Product',
  ProductVariant: 'ProductVariant',
  BundleItem: 'BundleItem',
  StockAdjustment: 'StockAdjustment',
  Category: 'Category',
  Customer: 'Customer',
  Order: 'Order',
  Refund: 'Refund',
  CreditSale: 'CreditSale',
  SplitPayment: 'SplitPayment',
  ActivityLog: 'ActivityLog',
  StaffInvitation: 'StaffInvitation',
  OrderItem: 'OrderItem',
  IntegrationApp: 'IntegrationApp'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
