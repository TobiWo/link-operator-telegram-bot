# ToDo

1. Add OCR-Listener
2. Outsource all strings to separate file
3. Listener should work for different chats (see local stash for first try)
    - or simply use the supplied chat-id's to reply to all chats
4. introduce `isAlreadyListening` variable per chat (see local stash for first try)
5. Add logger & proper error handling
6. Add unit-tests
7. Add dynamic path for address_info??
8. make getBillingSet abstract

## Question

Is just one provider for all instances enough or is it better to instantiate for every wizard a separate provider?
Best practice for initializing providers
