#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod payment_recorder {
    use ink::storage::Mapping;
    use ink::prelude::vec::Vec;

    /// Defines the storage of your contract.
    /// Stores a mapping from AccountId to a vector of PaymentRecords.
    #[ink(storage)]
    #[derive(Default)]
    pub struct PaymentRecorder {
        payment_history: Mapping<AccountId, Vec<PaymentRecord>>,
    }

    /// Represents a single payment record.
    #[derive(scale::Decode, scale::Encode, Debug, Clone, PartialEq, Eq)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct PaymentRecord {
        recipient: AccountId,
        amount: Balance,
        timestamp: Timestamp,
    }

    /// Event emitted when a payment is recorded.
    #[ink(event)]
    pub struct PaymentRecorded {
        #[ink(topic)]
        sender: AccountId,
        #[ink(topic)]
        recipient: AccountId,
        amount: Balance,
        timestamp: Timestamp,
    }

    impl PaymentRecorder {
        /// Constructor that initializes the `Mapping`.
        #[ink(constructor)]
        pub fn new() -> Self {
            Default::default()
        }

        /// Records a payment made by the caller.
        ///
        /// The actual DOT transfer must be handled separately by the user's wallet.
        /// This function only records the details provided.
        #[ink(message)]
        pub fn record_payment(&mut self, recipient: AccountId, amount: Balance) {
            let sender = self.env().caller();
            let timestamp = self.env().block_timestamp();

            let record = PaymentRecord {
                recipient,
                amount,
                timestamp,
            };

            let mut history = self.payment_history.get(&sender).unwrap_or_default();
            history.push(record);
            self.payment_history.insert(sender, &history);

            // Emit the event
            self.env().emit_event(PaymentRecorded {
                sender,
                recipient,
                amount,
                timestamp,
            });
        }

        /// Retrieves the payment history for a specific user account.
        #[ink(message)]
        pub fn get_payment_history(&self, user: AccountId) -> Vec<PaymentRecord> {
            self.payment_history.get(&user).unwrap_or_default()
        }

        /// Retrieves the payment history for the calling user account.
        #[ink(message)]
        pub fn get_my_payment_history(&self) -> Vec<PaymentRecord> {
            let caller = self.env().caller();
            self.get_payment_history(caller)
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::{test, DefaultEnvironment};

        fn default_accounts() -> test::DefaultAccounts<DefaultEnvironment> {
            test::default_accounts::<DefaultEnvironment>()
        }

        fn set_caller(caller: AccountId) {
            test::set_caller::<DefaultEnvironment>(caller);
        }

        #[ink::test]
        fn new_works() {
            let contract = PaymentRecorder::new();
            let accounts = default_accounts();
            assert_eq!(contract.get_my_payment_history(), Vec::new());
            assert_eq!(contract.get_payment_history(accounts.alice), Vec::new());
        }

        #[ink::test]
        fn record_payment_works() {
            let mut contract = PaymentRecorder::new();
            let accounts = default_accounts();
            let recipient = accounts.bob;
            let amount = 100;

            set_caller(accounts.alice);

            // Record first payment
            contract.record_payment(recipient, amount);

            // Check event emission (basic check, more advanced checks possible)
            let emitted_events = test::recorded_events().collect::<Vec<_>>();
            assert_eq!(emitted_events.len(), 1);

            // Check history
            let history = contract.get_my_payment_history();
            assert_eq!(history.len(), 1);
            assert_eq!(history[0].recipient, recipient);
            assert_eq!(history[0].amount, amount);
            // Timestamp check can be tricky in tests, often omitted or checked for non-zero

            // Record second payment
            let recipient2 = accounts.charlie;
            let amount2 = 200;
            contract.record_payment(recipient2, amount2);

            let history_updated = contract.get_my_payment_history();
            assert_eq!(history_updated.len(), 2);
            assert_eq!(history_updated[1].recipient, recipient2);
            assert_eq!(history_updated[1].amount, amount2);

            // Check history for another user (should be empty)
            assert_eq!(contract.get_payment_history(accounts.bob), Vec::new());
        }

         #[ink::test]
        fn get_payment_history_works() {
            let mut contract = PaymentRecorder::new();
            let accounts = default_accounts();

            set_caller(accounts.alice);
            contract.record_payment(accounts.bob, 100);
            contract.record_payment(accounts.charlie, 200);

            set_caller(accounts.bob);
            contract.record_payment(accounts.alice, 50);

            // Get Alice's history
            let alice_history = contract.get_payment_history(accounts.alice);
            assert_eq!(alice_history.len(), 2);
            assert_eq!(alice_history[0].recipient, accounts.bob);
            assert_eq!(alice_history[0].amount, 100);
            assert_eq!(alice_history[1].recipient, accounts.charlie);
            assert_eq!(alice_history[1].amount, 200);

            // Get Bob's history
            let bob_history = contract.get_payment_history(accounts.bob);
            assert_eq!(bob_history.len(), 1);
            assert_eq!(bob_history[0].recipient, accounts.alice);
            assert_eq!(bob_history[0].amount, 50);

            // Get Charlie's history (should be empty as sender)
            assert_eq!(contract.get_payment_history(accounts.charlie), Vec::new());
        }
    }

     #[cfg(all(test, feature = "e2e-tests"))]
    mod e2e_tests {
        use super::*;
        use ink_e2e::build_message;

        type E2EResult<T> = std::result::Result<T, Box<dyn std::error::Error>>;

        #[ink_e2e::test]
        async fn record_and_get_history_works(mut client: ink_e2e::Client<C, E>) -> E2EResult<()> {
            // Given
            let constructor = PaymentRecorderRef::new();
            let contract_acc_id = client
                .instantiate("payment_recorder", &ink_e2e::alice(), constructor, 0, None)
                .await
                .expect("instantiate failed")
                .account_id;

            let bob_account = ink_e2e::account_id(ink_e2e::AccountKeyring::Bob);
            let charlie_account = ink_e2e::account_id(ink_e2e::AccountKeyring::Charlie);

            // When
            // Alice records a payment to Bob
            let record_payment_msg1 = build_message::<PaymentRecorderRef>(contract_acc_id.clone())
                .call(|contract| contract.record_payment(bob_account.clone(), 100));
            client.call(&ink_e2e::alice(), record_payment_msg1, 0, None).await.expect("record_payment 1 failed");

            // Alice records another payment to Charlie
             let record_payment_msg2 = build_message::<PaymentRecorderRef>(contract_acc_id.clone())
                .call(|contract| contract.record_payment(charlie_account.clone(), 200));
            client.call(&ink_e2e::alice(), record_payment_msg2, 0, None).await.expect("record_payment 2 failed");


            // Then
            // Get Alice's history using get_my_payment_history
            let get_my_history_msg = build_message::<PaymentRecorderRef>(contract_acc_id.clone())
                .call(|contract| contract.get_my_payment_history());
            let my_history_res = client.call_dry_run(&ink_e2e::alice(), &get_my_history_msg, 0, None).await;
            let my_history = my_history_res.return_value();

            assert_eq!(my_history.len(), 2);
            assert_eq!(my_history[0].recipient, bob_account);
            assert_eq!(my_history[0].amount, 100);
            assert_eq!(my_history[1].recipient, charlie_account);
            assert_eq!(my_history[1].amount, 200);

             // Get Alice's history using get_payment_history
            let get_history_msg = build_message::<PaymentRecorderRef>(contract_acc_id.clone())
                .call(|contract| contract.get_payment_history(ink_e2e::account_id(ink_e2e::AccountKeyring::Alice)));
            let history_res = client.call_dry_run(&ink_e2e::alice(), &get_history_msg, 0, None).await;
             let history = history_res.return_value();

            assert_eq!(history.len(), 2);
            assert_eq!(history[0].recipient, bob_account);
            assert_eq!(history[0].amount, 100);

            // Get Bob's history (should be empty)
            let get_bob_history_msg = build_message::<PaymentRecorderRef>(contract_acc_id.clone())
                .call(|contract| contract.get_payment_history(bob_account.clone()));
            let bob_history_res = client.call_dry_run(&ink_e2e::bob(), &get_bob_history_msg, 0, None).await;
            let bob_history = bob_history_res.return_value();
            assert_eq!(bob_history.len(), 0);


            Ok(())
        }
    }
}
