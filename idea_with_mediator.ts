// Difference here is that we use the mediator pattern to define Jobs, so that there is no need for the orchestrator

abstract class Agent2 {
    _unitOfWork: UnitOfWork2;

    constructor(unitOfWork: UnitOfWork2) {
        this._unitOfWork = unitOfWork;
    }

    processEvent(event: TheEvent2): TheEvent2 { return } // TODO: Override?
}

class TheEvent2 {
    type: string;
    payload: string;
    success?: boolean; // entry and exit events distinction?
}

// Use case (for now the assumption is that everything is seqential for the sake of simplicity)
// TODO: Paralelize event processing (how could one agent wait for events from multiple agents?)

// 0. Financing has been requested for an invoice. The controller agent picks up the request and then following needs to happen:
// 1. Invoice needs to be checked for existence and status - Invoicing agent
// 2. Limits needs to be checked - Credit limits agent
// 3. ERP document needs to be created - Accounting agent
// 4. Invoice status should be updated - Invoicing agent
// 5. Limits needs to be updated - Credit limits agent

// // Domain model and repos

class Invoice2 { // These are regular OOP objects
    id: string;
    amount: string;
    company: Company;
    status: string; // 0 - Available for financing: 1 - Financed;

    updateStatus(status: string) {
        this.status = status;
    }
}

class Company2 {
    id: string;
    name: string;
}

class CreditLimit2 {
    company: Company2;
    limit: number;
    usedLimit: number;

    verifyAvailableLimit(required: number): boolean {
        return this.usedLimit + required <= this.limit;
    }

    updateUsedLimit(amount: number): void {
        this.usedLimit += amount;
    }
}

class ERPDocument2 {
    id: string;
    invoiceId: string;
    amount: string;
    company: Company;
}

class UnitOfWork2 { // TODO: Add interface instead
    invoiceRepo: Invoice2[]; // TODO: Add repos instead
    companyRepo: Company2[];
    creditLimitRepo: CreditLimit2[];
    erpRepo: ERPDocument2[];

    // TODO: These will go to respective repositories, only used for CRUD operations
    getInvoice(invoiceId: string): Invoice2 {
        return this.invoiceRepo.find(i => i.id === invoiceId);
    }
    
    updateInvoice(invoice: Invoice): void {
        const invoiceToUpdateIndex = this.invoiceRepo.findIndex(i => i.id === invoice.id);
        this.invoiceRepo[invoiceToUpdateIndex] = invoice;
        console.log("added invoice to update" + JSON.stringify(invoice));
    }

    getCompany(companyId: string): Company2 {
        return this.companyRepo.find(c => c.id === companyId);
    }

    getCreditLimit(companyId: string): CreditLimit2 {
        return this.creditLimitRepo.find(c => c.company.id === companyId);
    }
    
    updateCreditLimit(creditLimit: CreditLimit2): void {
        const limitToUpdateIndex = this.creditLimitRepo.findIndex(c => c.company.id === creditLimit.company.id);
        this.creditLimitRepo[limitToUpdateIndex] = creditLimit;
        console.log("added credit limit to update" + JSON.stringify(creditLimit));
    }

    
    addERPDocument(document: ERPDocument2): void {
        this.erpRepo.push(document);
        console.log("added new erp doc" + JSON.stringify(document));
    }

    public commmit(): void {
        console.log("Changes committed!")
        console.log(JSON.stringify(this.invoiceRepo))
        console.log(JSON.stringify(this.companyRepo))
        console.log(JSON.stringify(this.creditLimitRepo))
        console.log(JSON.stringify(this.erpRepo))
    }
}


// // Events
// Job: Process financing request of an invoice // JOB is a set of events that need to happen in order for a business transaction to be complete
// TODO: Consider adding a job entity which consists of events in sequence
const EVENT_FIN_REQUESTED2: string = "financingrequested" // Recipient - Invoicing agent
const EVENT_INV_VALIDATED2: string = "invoiceValidatedEvent" // Recipient - Credit limits agent
const EVENT_LIMITS_VALIDATED2: string = "limitsValidatedEvent" // Recipient - Accounting agent
const EVENT_ERP_DOC_CREATED2: string = "erpDocumentCreated" // Recipient - Invoicing agent
const EVENT_INV_UPDATED2: string = "invoiceUpdatedEvent" // Recipient - Credit limits agent

// // Agents

class InvoicingAgent2 extends Agent2 { // Agent represents a person\machine which performs a specific sets of tasks that are part of a job.
    processEvent(event: TheEvent2): TheEvent2 { 
        let chainEvent;
        if (event.type === EVENT_FIN_REQUESTED2)
        {
            this.processInvoiceValidation(event);
            chainEvent = { type: EVENT_INV_VALIDATED2, payload: event.payload } as TheEvent;  
        }

        if (event.type === EVENT_ERP_DOC_CREATED2)
        {
            this.updateInvoiceStatus(event);
            chainEvent = { type: EVENT_INV_UPDATED2, payload: event.payload } as TheEvent;  
        }

        return chainEvent;
    }

    private processInvoiceValidation(event: TheEvent): boolean {
        return true; // These are the only place where business logic happens
    }

    private updateInvoiceStatus(event: TheEvent): boolean {
        return true;
    }
}

class CreditLimitsAgent2 extends Agent2 {
    processEvent(event: TheEvent2): TheEvent2 {
        let chainEvent;
        
        if (event.type === EVENT_INV_VALIDATED2)
        {
            this.processLimitsVerification(event); 
            chainEvent = { type: EVENT_LIMITS_VALIDATED2, payload: event.payload } as TheEvent;  
        }

        if (event.type === EVENT_INV_UPDATED2)
        {
            this.processLimitsUpdate(event); 
            // TODO: Who is downstream from the last event in a job?
        }

        return chainEvent;
    }

    private processLimitsVerification(event: TheEvent2): boolean {
        return true;
    }

    private processLimitsUpdate(event: TheEvent2): boolean {
        return true;
    }
}

class AccountingAgent2 extends Agent2 {
    processEvent(event: TheEvent2): TheEvent2 {
        let chainEvent;
        if (event.type === EVENT_LIMITS_VALIDATED2)
        {
            this.processERPDocumentCreation(event);
            chainEvent = { type: EVENT_ERP_DOC_CREATED2, payload: event.payload } as TheEvent2;  
        }

        return chainEvent;
    }

    private processERPDocumentCreation(event: TheEvent2): boolean {
        return true;
    }
}

// Mediator implementation representing a single job
class RequestFinancingJob { // Add abstract class
    _invoicingAgent: Agent2;
    _creditLimitsAgent: Agent2;
    _accountingAgent: Agent2;
    _unitOfWork: UnitOfWork2;
    
    constructor(
        invoicingAgent: InvoicingAgent2, 
        creditLimitsAgent: CreditLimitsAgent2, 
        accountingAgent: AccountingAgent2, 
        unitOfWork: UnitOfWork) { 

        this._invoicingAgent = invoicingAgent;
        this._creditLimitsAgent = creditLimitsAgent;
        this._accountingAgent = accountingAgent;
        this._unitOfWork = unitOfWork;
    }

    performJob(initiatingEvent: TheEvent2): TheEvent2 { // This should be job framework
        var result = this.doWork(initiatingEvent);

        if (result.success)
        {
            this.commitWork();
        }

        return result;
    }

    doWork(initiatingEvent: TheEvent2): TheEvent2 {
        var finalEvent;

        try { // this inside is job specific, rest should be job framework
            var chainEvent = this._invoicingAgent.processEvent(initiatingEvent);
            chainEvent = this._creditLimitsAgent.processEvent(chainEvent);
            finalEvent = this._accountingAgent.processEvent(chainEvent);
        }
        catch(e) {
            // log issue
            // return error log event
            return null;
        }

        return finalEvent;
    }

    commitWork(): void {
        this._unitOfWork.commmit();
    }
}

// the program

class Program2 {
    run(): void {
        const unitOfWork = new UnitOfWork2();

        // TODO: These will be provided through dependency injection and events\jobs could be defined in their ctor instead
        const invoicingAgent = new InvoicingAgent2(unitOfWork);
        const creditLimitsAgent = new CreditLimitsAgent2(unitOfWork);
        const accountingAgent = new AccountingAgent2(unitOfWork);

        const requestFinancingJob = new RequestFinancingJob(invoicingAgent, creditLimitsAgent, accountingAgent, unitOfWork);

        // Start // TODO: This would be done in the controller for example, after an endpoint is hit
        var result = requestFinancingJob.performJob({ type: EVENT_FIN_REQUESTED, payload: "{ \"invoiceId\": 1 }" } );

        if (result.success)
        {
            // map result to DTO and return
        } else {
            // report error based on result content
        }
    }
}

const program2 = new Program2();
program2.run();

