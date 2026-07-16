// g++ -std=c++17 -o demo 18-state.cpp
#include <iostream>
#include <memory>

class VendingMachine;

class State {
public:
  virtual void insertCoin(VendingMachine& m) = 0;
  virtual ~State() = default;
};

class VendingMachine {
  std::unique_ptr<State> state_;
public:
  void setState(std::unique_ptr<State> s) { state_ = std::move(s); }
  void insertCoin() { state_->insertCoin(*this); }
};

class IdleState;
class HasCoinState;

class IdleState : public State {
public:
  void insertCoin(VendingMachine& m) override;
};

class HasCoinState : public State {
public:
  void insertCoin(VendingMachine& m) override {
    std::cout << "already has coin\n";
  }
};

void IdleState::insertCoin(VendingMachine& m) {
  std::cout << "coin inserted\n";
  m.setState(std::make_unique<HasCoinState>());
}

int main() {
  VendingMachine vm;
  vm.setState(std::make_unique<IdleState>());
  vm.insertCoin();
  vm.insertCoin();
  return 0;
}
