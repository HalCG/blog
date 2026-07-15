// g++ -std=c++17 -o demo 04-strategy.cpp
#include <iostream>
#include <memory>

class PaymentStrategy {
public:
  virtual void pay(double amount) = 0;
  virtual ~PaymentStrategy() = default;
};

class Alipay : public PaymentStrategy {
public:
  void pay(double amount) override {
    std::cout << "Alipay: " << amount << "\n";
  }
};

class Checkout {
  std::unique_ptr<PaymentStrategy> strategy_;
public:
  void setStrategy(std::unique_ptr<PaymentStrategy> s) {
    strategy_ = std::move(s);
  }
  void checkout(double amount) {
    if (strategy_) strategy_->pay(amount);
  }
};

int main() {
  Checkout c;
  c.setStrategy(std::make_unique<Alipay>());
  c.checkout(99.0);
  return 0;
}
