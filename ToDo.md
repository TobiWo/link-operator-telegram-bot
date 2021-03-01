# ToDo

1. Add average ocr feed-reward in OcrFeedRewardWizard
2. Listener should work for different chats (see local stash for first try)
    - or simply use the supplied chat-id's to reply to all chats
    - introduce `isAlreadyListening` variable per chat (see local stash for first try) to check which chat is listening
3. Add function/module to get info from single feed/contract
4. Add rate-limiter to ctx.reply in contract.on because of max num of requests from telegram api (see: [here](https://stackoverflow.com/questions/31914062/telegram-bot-api-error-code-429-error-too-many-requests-retry-later#:~:text=There%20is%20a%20limit%20for,will%20get%20that%20Error%20429.&text=If%20you're%20sending%20bulk,messages%20per%20second%20or%20so.))
    - Alternatively store events from contract.on and reply in slower fashion
5. Add parser to parse reference-data-directory??
6. commands should be accepted in lower and upper case?!
7. Add logger & proper error handling
8. Add unit-tests
9. Add dynamic path for address_info??

- add feed-wizard-class interface

## Question

Is just one provider for all instances enough or is it better to instantiate for every wizard a separate provider?
Best practice for initializing providers
