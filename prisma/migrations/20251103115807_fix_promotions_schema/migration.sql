-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "artistId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_methods" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "lastFour" TEXT,
    "expirationMonth" TEXT,
    "expirationYear" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "artistId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_transactions" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "artistId" TEXT,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_methods" ADD CONSTRAINT "payment_methods_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_methods" ADD CONSTRAINT "payment_methods_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_transactions" ADD CONSTRAINT "payment_transactions_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_transactions" ADD CONSTRAINT "payment_transactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
