Agent-driven programming

Trying to replicate real-world business transaction processing with software. 

*Agents* is this contexts are persons\machines that perform specific tasks which are part of a *job* (chain of events signaling task completion), in order to complete a business transaction. 

*Agents* (person or a machine) react to *events* (i.e. previous task of a job has been successfuly completed), work with *objects* (domain object such as invoice) and can use a *service* (shared tool such as Excel) to perform the necessary transformation before passing the information further down the chain until the transaction is completed.

The orchestration of the job is performed by the framework (i.e. IOrchestrator) so that every agent thinks only about how to perform it's task and what information to pass further. 

During program startup agents with their specific events are registered with the orchestrator. These job descriptions (chain of events) together with the agents fully describe the functionality of the program. 