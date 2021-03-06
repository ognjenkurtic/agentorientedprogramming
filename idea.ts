
// Framework

interface IOrchestrator {
    addEvent(event: TheEvent): void;
    addSubscription(agent: Agent, eventType: string): boolean;
}

class Orchestrator implements IOrchestrator { // TODO: ATM just used to trigger subscribed agents, could be extended to a real queue if need arises
    subscriptions: Subscription[] = []; 
    
    addEvent(event: TheEvent): void {
        console.log("New event received:" + JSON.stringify(event));
        this.subscriptions
            .filter(s => s.eventType === event.type) // TODO: check class type equality
            .forEach(s => {
                console.log("Triggering agent:" + typeof s.agent);
                const followUp = s.agent.processEvent(event);
                
                if (followUp) { // Consider better approach (i.e. part of job?)
                    this.addEvent(followUp);
                };
            });
    }
    
    addSubscription(agent: Agent, eventType: string): boolean {
        this.subscriptions.push( { agent, eventType} as Subscription);
        return true;
    }
}

abstract class Agent {
    _orchestrator: IOrchestrator;
    _listensFor: string[];
    _unitOfWork: UnitOfWork;
    
    constructor(orchestrator: IOrchestrator, events: string[], unitOfWork: UnitOfWork) {
        this._orchestrator = orchestrator;
        this._listensFor = events;
        this._unitOfWork = unitOfWork;

        events.forEach(ev => {
            this._orchestrator.addSubscription(this, ev);
        });
    }

    processEvent(event: TheEvent): TheEvent { return } // TODO: Override?
}

class TheEvent {
    type: string;
    payload: string;
}

class Subscription {
    eventType: string;
    agent: Agent;
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

class Invoice { // These are regular OOP objects
    id: string;
    amount: string;
    company: Company;
    status: string; // 0 - Available for financing: 1 - Financed;

    updateStatus(status: string) {
        this.status = status;
    }
}

class Company {
    id: string;
    name: string;
}

class CreditLimit {
    company: Company;
    limit: number;
    usedLimit: number;

    verifyAvailableLimit(required: number): boolean {
        return this.usedLimit + required <= this.limit;
    }

    updateUsedLimit(amount: number): void {
        this.usedLimit += amount;
    }
}

class ERPDocument {
    id: string;
    invoiceId: string;
    amount: string;
    company: Company;
}

class UnitOfWork { // TODO: Add interface instead
    invoiceRepo: Invoice[]; // TODO: Add repos instead
    companyRepo: Company[];
    creditLimitRepo: CreditLimit[];
    erpRepo: ERPDocument[];

    // TODO: These will go to respective repositories, only used for CRUD operations
    getInvoice(invoiceId: string): Invoice {
        return this.invoiceRepo.find(i => i.id === invoiceId);
    }
    
    updateInvoice(invoice: Invoice): void {
        const invoiceToUpdateIndex = this.invoiceRepo.findIndex(i => i.id === invoice.id);
        this.invoiceRepo[invoiceToUpdateIndex] = invoice;
        console.log("added invoice to update" + JSON.stringify(invoice));
    }

    getCompany(companyId: string): Company {
        return this.companyRepo.find(c => c.id === companyId);
    }

    getCreditLimit(companyId: string): CreditLimit {
        return this.creditLimitRepo.find(c => c.company.id === companyId);
    }
    
    updateCreditLimit(creditLimit: CreditLimit): void {
        const limitToUpdateIndex = this.creditLimitRepo.findIndex(c => c.company.id === creditLimit.company.id);
        this.creditLimitRepo[limitToUpdateIndex] = creditLimit;
        console.log("added credit limit to update" + JSON.stringify(creditLimit));
    }

    
    addERPDocument(document: ERPDocument): void {
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
const EVENT_FIN_REQUESTED: string = "financingrequested" // Recipient - Invoicing agent
const EVENT_INV_VALIDATED: string = "invoiceValidatedEvent" // Recipient - Credit limits agent
const EVENT_LIMITS_VALIDATED: string = "limitsValidatedEvent" // Recipient - Accounting agent
const EVENT_ERP_DOC_CREATED: string = "erpDocumentCreated" // Recipient - Invoicing agent
const EVENT_INV_UPDATED: string = "invoiceUpdatedEvent" // Recipient - Credit limits agent

// // Agents

class InvoicingAgent extends Agent { // Agent represents a person\machine which performs a specific sets of tasks that are part of a job.
    processEvent(event: TheEvent): TheEvent { 
        let followUpEvent;
        if (event.type === EVENT_FIN_REQUESTED)
        {
            this.processInvoiceValidation(event);
            followUpEvent = { type: EVENT_INV_VALIDATED, payload: event.payload } as TheEvent;  
        }

        if (event.type === EVENT_ERP_DOC_CREATED)
        {
            this.updateInvoiceStatus(event);
            followUpEvent = { type: EVENT_INV_UPDATED, payload: event.payload } as TheEvent;  
        }

        return followUpEvent;
    }

    private processInvoiceValidation(event: TheEvent): boolean {
        return true; // These are the only place where business logic happens
    }

    private updateInvoiceStatus(event: TheEvent): boolean {
        return true;
    }
}

class CreditLimitsAgent extends Agent {
    processEvent(event: TheEvent): TheEvent {
        let followUpEvent;
        
        if (event.type === EVENT_INV_VALIDATED)
        {
            this.processLimitsVerification(event); 
            followUpEvent = { type: EVENT_LIMITS_VALIDATED, payload: event.payload } as TheEvent;  
        }

        if (event.type === EVENT_INV_UPDATED)
        {
            this.processLimitsUpdate(event); 
            this._unitOfWork.commmit(); // TODO: To we need a separate agent for finalization of the job (i.e. agent for database updates)
            // TODO: Who is downstream from the last event in a job?
        }

        return followUpEvent;
    }

    private processLimitsVerification(event: TheEvent): boolean {
        return true;
    }

    private processLimitsUpdate(event: TheEvent): boolean {
        return true;
    }
}

class AccountingAgent extends Agent {
    processEvent(event: TheEvent): TheEvent {
        let followUpEvent;
        if (event.type === EVENT_LIMITS_VALIDATED)
        {
            this.processERPDocumentCreation(event);
            followUpEvent = { type: EVENT_ERP_DOC_CREATED, payload: event.payload } as TheEvent;  
        }

        return followUpEvent;
    }

    private processERPDocumentCreation(event: TheEvent): boolean {
        return true;
    }
}

// the program

class Program {
    run(): void {
        const orchestrator = new Orchestrator();
        const unitOfWork = new UnitOfWork();

        // TODO: These will be provided through dependency injection and events\jobs could be defined in their ctor instead
        const invoicingAgent = new InvoicingAgent(orchestrator, [ EVENT_FIN_REQUESTED, EVENT_ERP_DOC_CREATED ], unitOfWork);
        const creditLimitsAgent = new CreditLimitsAgent(orchestrator, [ EVENT_INV_VALIDATED, EVENT_INV_UPDATED ], unitOfWork);
        const accountingAgent = new AccountingAgent(orchestrator, [ EVENT_LIMITS_VALIDATED ], unitOfWork);

        // Start // TODO: This would be done in the controller for example, after an endpoint is hit
        orchestrator.addEvent({ type: EVENT_FIN_REQUESTED, payload: "{ \"invoiceId\": 1 }" });
    }
}

const program = new Program();
program.run();

