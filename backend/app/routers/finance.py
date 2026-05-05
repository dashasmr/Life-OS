from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.crud import create_finance_transaction, list_finance_transactions
from app.database import get_db
from app.schemas import FinanceKind, FinanceTransactionCreate, FinanceTransactionRead

router = APIRouter(prefix="/finance", tags=["finance"])


@router.post("/transactions", response_model=FinanceTransactionRead, status_code=201)
def create_finance_transaction_endpoint(payload: FinanceTransactionCreate, db: Session = Depends(get_db)):
    return create_finance_transaction(db, payload)


@router.get("/transactions", response_model=list[FinanceTransactionRead])
def list_finance_transactions_endpoint(
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    kind: FinanceKind | None = Query(None),
):
    return list_finance_transactions(db, limit=limit, offset=offset, kind=kind)
