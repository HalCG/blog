// g++ -std=c++17 -o demo 22-chain.cpp
#include <iostream>
#include <memory>

struct Request { int leaveDays; };

class Handler {
  std::unique_ptr<Handler> next_;
public:
  void setNext(std::unique_ptr<Handler> n) { next_ = std::move(n); }
  virtual void handle(const Request& req) {
    if (next_) next_->handle(req);
    else std::cout << "no handler\n";
  }
  virtual ~Handler() = default;
};

class Manager : public Handler {
public:
  void handle(const Request& req) override {
    if (req.leaveDays <= 3) {
      std::cout << "Manager approved " << req.leaveDays << " days\n";
    } else {
      Handler::handle(req);
    }
  }
};

class Director : public Handler {
public:
  void handle(const Request& req) override {
    std::cout << "Director approved " << req.leaveDays << " days\n";
  }
};

int main() {
  auto dir = std::make_unique<Director>();
  auto mgr = std::make_unique<Manager>();
  mgr->setNext(std::move(dir));
  mgr->handle({2});
  mgr->handle({10});
  return 0;
}
